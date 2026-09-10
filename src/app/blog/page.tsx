import Footer from "@/components/shared/footer"
import Navbar from "@/components/shared/navbar"
import { MarketingShell } from "@/components/shared/marketing-shell"
import { getBlogs } from "./util"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"

export default function Blogs() {
    const blogs = getBlogs()

    return (
        <MarketingShell footer={<Footer />}>
            <Navbar />
            <div className="marketing-rule w-full min-w-0 px-6 py-16 sm:px-10 md:px-14 lg:px-16 md:py-20">
                <h1 className="text-3xl font-semibold tracking-tight text-brand-ink md:text-4xl">Read the Blogs</h1>
                <p className="mt-3 max-w-3xl text-slate-600">
                    Notes on cloud coding agents, software factories, agent harnesses and running a fleet in production.
                </p>

                <div className="mt-12 grid w-full min-w-0 grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {blogs.map((blog, index) => (
                        <article
                            key={index}
                            className="flex min-w-0 flex-col border border-(--marketing-line) bg-[#0E0E12] transition-colors hover:border-brand/30"
                        >
                            <div className="relative mx-6 mt-6 aspect-16/10 overflow-hidden sm:mx-8 sm:mt-8">
                                <Image
                                    src={`/${blog.metadata.image}`}
                                    alt={blog.metadata.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
                                <h2 className="text-xl font-semibold leading-snug text-brand-ink">{blog.metadata.title}</h2>
                                <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{blog.metadata.subtitle}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm text-slate-500">
                                    <p className="font-medium text-slate-700">{blog.metadata.author}</p>
                                    <span className="hidden text-slate-400 sm:inline">•</span>
                                    <p>{formatDistanceToNow(new Date(blog.metadata.date), { addSuffix: true })}</p>
                                </div>
                                <div className="mt-auto flex justify-end pt-2">
                                    <Button asChild className="rounded-none bg-brand text-white hover:bg-brand/90">
                                        <Link href={`/blog/${blog.metadata.slug}`}>Read More</Link>
                                    </Button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </MarketingShell>
    )
}
