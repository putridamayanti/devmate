import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Label} from "@/components/ui/label.tsx";

export default function ChangeUnstagedSection(props: any) {
    const { changes, selectedPath, selectedFiles, onSelect, onCheck } = props;

    return (
        <section className="min-h-1/3 space-y-2 p-3">
            <div className="px-2 pb-4 flex items-center gap-3 border-b border-b-gray-200">
                <Checkbox />
                <Label>Unstaged Changes</Label>
            </div>

            {changes.map((c: any, i: number) => {
                const isActive = selectedPath === c.path;
                const checked = selectedFiles.has(c.path);

                return (
                    <li
                        key={i}
                        className={`flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 ${
                            isActive ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-muted"
                        }`}
                        onClick={() => onSelect(c.path)}
                    >
                        <Checkbox
                            checked={checked}
                            onCheckedChange={() => onCheck(c.path)}/>
                        <span className="text-[12px] break-all truncate flex-1">{c.path}</span>
                    </li>
                );
            })}
        </section>
    )
}
