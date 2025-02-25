// Add this new ProgressBar component above the PracticeTracker component
export const ProgressBar = ({ completed, total }: { completed: number; total: number }) => {
    const percentage = (completed / total) * 100;
    const segments =50; // Number of segments like Nothing UI
    const filledSegments = Math.floor((percentage / 100) * segments);

    return (
        <div className="w-full max-w-full flex items-center gap-1">
            {/*<span className="">[</span>*/}
                <div className="flex-1 flex gap-[2px]">
                {Array.from({ length: segments }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-[2px] gap-0 -rotate-90 flex-1 ${
                            index < filledSegments
                                ? 'bg-red-600'
                                : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                    />
                ))}
            </div>
            {/*<span className="">]</span>*/}
        </div>
    );
};