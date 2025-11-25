export default function ChangePreviewSection(props: any) {
    const { selectedPath, loading, diffError, diffLines } = props;
    console.log(diffLines)
    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">
                    {selectedPath ? selectedPath : "Select a file to view its changes"}
                </div>
                {loading && <div className="text-xs opacity-70">Loading diff…</div>}
            </div>

            {diffError && <div className="text-sm text-red-600 mb-2">{diffError}</div>}

            {!selectedPath && (
                <div className="text-sm opacity-70">Choose a file from the list to see its diff.</div>
            )}

            {selectedPath && diffLines && (
                <div className="border rounded bg-muted/40 text-xs font-mono overflow-auto min-h-[80vh] max-h-[80vh]">
                    {diffLines.map((line: any, idx: number) => {
                        const base = "px-3 py-0.5 whitespace-pre";
                        let bg = "";
                        if (line.type === "add") bg = "bg-emerald-100 dark:bg-emerald-900/40";
                        if (line.type === "remove") bg = "bg-red-100 dark:bg-red-900/40";
                        if (line.type === "meta") bg = "bg-slate-100 dark:bg-slate-800/60";
                        return (
                            <div key={idx} className={`${base} ${bg}`}>
                                {line.raw}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    )
}
