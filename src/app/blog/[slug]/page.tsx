import Footer from "@/components/shared/footer"
import Navbar from "@/components/shared/navbar"
import { MarketingShell } from "@/components/shared/marketing-shell"
import { getBlogBySlug } from "../util"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug
    const blog = getBlogBySlug(slug)

    if (!blog) {
        return (
            <MarketingShell footer={<Footer />}>
                <Navbar />
                <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
                    <h1>404 - Blog not found</h1>
                    <Button asChild><Link href="/">Go to Home</Link></Button>
                </div>
            </MarketingShell>
        )
    }

    return (
        <MarketingShell footer={<Footer />}>
            <Navbar />
            <div className="marketing-rule">
                <div className="relative h-[300px] overflow-hidden md:h-[420px]">
                    <Image
                        src={`/${blog.metadata.image}`}
                        alt={blog.metadata.title}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#08080A] via-[#08080A]/70 to-[#08080A]/30" />
                </div>
            </div>
            <div className="marketing-rule px-8 py-12 md:px-14 md:py-16">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-brand-ink md:text-4xl">{blog.metadata.title}</h1>
                <h2 className="mt-4 text-base leading-relaxed text-slate-700 md:text-xl">{blog.metadata.subtitle}</h2>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <p className="font-medium text-slate-700">{blog.metadata.author}</p>
                    <span className="hidden text-slate-400 sm:inline">•</span>
                    <p>{formatDistanceToNow(new Date(blog.metadata.date), { addSuffix: true })}</p>
                </div>
            </div>
            <div className="marketing-rule mdc px-8 py-12 md:px-14 md:py-16">
                <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        table: ({ children }) => (
                            <div className="mdc-table-wrap">
                                <table>{children}</table>
                            </div>
                        ),
                    }}
                >
                    {blog.content}
                </Markdown>
            </div>
        </MarketingShell>
    )
}
