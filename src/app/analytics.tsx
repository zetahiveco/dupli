"use client";

export default function GoogleAnalytics() {
    return (
        <div dangerouslySetInnerHTML={{ __html: `
            <!-- Google tag (gtag.js) -->
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-C7FMWG8C75"></script>
            <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-C7FMWG8C75');
            </script>
        ` }} />
    )
}