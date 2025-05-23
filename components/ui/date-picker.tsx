"use client"

import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker"

interface DatePickerWithRangeProps {
    className?: string
    date: DateValueType
    setDate: (date: DateValueType) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const handleValueChange = (newValue: DateValueType) => {
        setDate(newValue)
    }

    return (
        <div className={cn("relative w-auto", className)}>
            <Datepicker
                value={date}
                onChange={handleValueChange}
                inputClassName="border border-input rounded-md h-9 px-3 py-1 text-sm bg-transparent"
                toggleClassName="absolute right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                toggleIcon={() => <CalendarIcon className="h-4 w-4" />}
                useRange={true}
                asSingle={false}
                showShortcuts={true}
                primaryColor="indigo"
                placeholder="Select date range"
                separator="to"
                displayFormat="MMM DD, YYYY"
                readOnly={true}
            />
        </div>
    )
} 