"use client"

import * as React from "react"
import Datepicker from "react-tailwindcss-datepicker"

export type CalendarProps = React.ComponentProps<typeof Datepicker>

export function Calendar(props: CalendarProps) {
    return (
        <Datepicker
            containerClassName="p-3"
            inputClassName="hidden"
            toggleClassName="hidden"
            useRange={false}
            asSingle={true}
            displayFormat="MMM DD, YYYY"
            {...props}
        />
    )
} 