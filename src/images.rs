use anyhow::{bail, Context, Result};
use base64::Engine;
use crate::protocol::ImageAttachment;

const MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;
const MAX_IMAGES_PER_MESSAGE: usize = 5;

/// Sniffs the image format from magic bytes.
pub fn sniff(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("image/png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if bytes.starts_with(b"GIF8") {
        Some("image/gif")
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

fn attach(bytes: Vec<u8>, label: &str) -> Result<ImageAttachment> {
    if bytes.len() > MAX_IMAGE_BYTES {
        bail!(
            "'{label}' is {} MB — images must be under 5 MB",
            bytes.len() / (1024 * 1024)
        );
    }
    let media_type = sniff(&bytes)
        .with_context(|| format!("'{label}' is not a PNG, JPEG, GIF, or WebP image"))?;
    Ok(ImageAttachment {
        media_type: media_type.to_owned(),
        data: base64::engine::general_purpose::STANDARD.encode(&bytes),
    })
}

/// Loads an image from a local file path.
pub fn load_path(path: &std::path::Path) -> Result<ImageAttachment> {
    let bytes = std::fs::read(path)
        .with_context(|| format!("Cannot read image {}", path.display()))?;
    attach(bytes, &path.display().to_string())
}

/// Fetches an image from an http(s) URL.
pub async fn fetch_url(
    client: &reqwest::Client,
    url: &str,
) -> Result<ImageAttachment> {
    let response = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("Failed to fetch {url}"))?;
    let status = response.status();
    if !status.is_success() {
        bail!("Fetching {url} returned HTTP {status}");
    }
    let bytes = response
        .bytes()
        .await
        .with_context(|| format!("Failed to read image body from {url}"))?;
    attach(bytes.to_vec(), url)
}

/// True if the source looks like an http(s) URL.
pub fn is_url(source: &str) -> bool {
    source.starts_with("http://") || source.starts_with("https://")
}

/// How many images are still allowed for the pending message.
pub fn remaining(count: usize) -> Result<()> {
    if count >= MAX_IMAGES_PER_MESSAGE {
        bail!("At most {MAX_IMAGES_PER_MESSAGE} images per message");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sniffs_common_formats() {
        assert_eq!(sniff(&[0x89, b'P', b'N', b'G', 0, 0]), Some("image/png"));
        assert_eq!(sniff(&[0xFF, 0xD8, 0xFF, 0xE0]), Some("image/jpeg"));
        assert_eq!(sniff(b"GIF89a"), Some("image/gif"));
        assert_eq!(sniff(b"RIFFxxxxWEBP"), Some("image/webp"));
        assert_eq!(sniff(b"hello world"), None);
    }
}
