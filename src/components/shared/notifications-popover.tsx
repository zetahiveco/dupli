"use client"

import { Button } from "@/components/ui/button"
import { getNotifications, markAllAsRead, markAsRead } from "@/app/console/notifications/actions"
import { useEffect, useState } from "react"
import { PiX } from "react-icons/pi"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PiBellFill } from "react-icons/pi"

export default function NotificationsPopover() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        handleFetchNotifications()
    }, [])

    useEffect(() => {
        if (open) {
            handleFetchNotifications()
        }
    }, [open])

    const handleFetchNotifications = async () => {
        try {
            setLoading(true)
            const notifications = await getNotifications()
            setNotifications(notifications)
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead()
            handleFetchNotifications()
        }
        catch (err) {
            console.log(err)
        }
    }

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markAsRead(notificationId)
            handleFetchNotifications()
        }
        catch (err) {
            console.log(err)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className={`p-2 active:scale-95 flex flex-start items-center rounded-none gap-2 hover:bg-white/20 transition-all text-[15px] relative`}>
                    <PiBellFill className="text-xl text-gray-600" />
                    {notifications.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-none text-[10px] text-white flex items-center justify-center">
                            {notifications.length}
                        </div>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="center" sideOffset={20} className="w-[400px] p-0">
                <div>
                    <div className="h-[50px] w-full flex items-center justify-between px-4 border-b-[1px] border-zinc-200">
                        <h1 className="font-semibold">Notifications</h1>
                        <Button onClick={handleMarkAllAsRead} variant="ghost" size="sm">
                            <PiX />
                        </Button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {!loading && notifications.map((notification) => (
                            <div key={notification.id} className="border-b border-zinc-100 pb-2 flex items-center justify-between">
                                <div className="pl-2">
                                    <p className="text-sm flex-1">{notification.message}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{format(new Date(notification.createdAt), 'MMM d, yyyy')}</p>
                                </div>
                                <Button onClick={() => handleMarkAsRead(notification.id)} variant="ghost" size="sm">
                                    <PiX />
                                </Button>

                            </div>
                        ))}
                        {notifications.length === 0 && !loading && (
                            <div className="py-8 text-center text-sm text-zinc-500">
                                No notifications found
                            </div>
                        )}
                        {loading && (
                            <div className="py-8 text-center text-sm text-zinc-500">
                                Loading...
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
