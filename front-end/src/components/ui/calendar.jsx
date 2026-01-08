import React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4 w-full h-full", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full h-full",
                month: "space-y-4 w-full h-full flex flex-col",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-lg font-semibold text-gray-200",
                nav: "space-x-1 flex items-center bg-gray-800/50 rounded-lg p-0.5 border border-gray-700/50",
                nav_button: cn(
                    "h-7 w-7 bg-transparent p-0 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md flex items-center justify-center transition-all"
                ),
                nav_button_previous: "!static",
                nav_button_next: "!static",
                table: "w-full h-full border-collapse",
                head_row: "flex w-full",
                head_cell:
                    "text-muted-foreground w-full font-medium text-xs text-center uppercase tracking-wider text-gray-500 pb-2",
                row: "flex w-full flex-1 border-t border-gray-800",
                cell: "min-h-[100px] w-full border-r border-gray-800 relative p-0 hover:bg-gray-800/30 transition-colors focus-within:relative focus-within:z-20 [&:last-child]:border-r-0",
                day: cn(
                    "w-full h-full p-2 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start gap-1"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-transparent text-white hover:bg-white/5",
                day_today: "bg-indigo-500/5 text-indigo-400 font-bold",
                day_outside:
                    "day-outside text-gray-700 opacity-40 hover:bg-transparent",
                day_disabled: "text-gray-800 opacity-20",
                day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                ...(props.components || {}),
            }}
            {...props}
        />
    );
}
Calendar.displayName = "Calendar";

export { Calendar };
