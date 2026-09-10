import fs from "fs"
import path from "path"
import matter from "gray-matter"



export function getBlogs() {
    const blogDirectory = path.join(process.cwd(), "src", "blogs")
    const items = fs.readdirSync(blogDirectory)
    const blogs: any[] = []

    items.forEach((item) => {
        const fullPath = path.join(blogDirectory, item)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        let matterResult = matter(fileContents)
        blogs.push({
            metadata: matterResult.data,
            content: matterResult.content
        })
    })

    return blogs
}

export function getBlogBySlug(slug: string) {
    const blogs = getBlogs()
    const blog = blogs.find((blog) => blog.metadata.slug === slug)
    if (!blog) {
        return null
    }
    return blog
}
