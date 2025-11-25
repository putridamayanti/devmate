export default function PageTitle(props: any) {
    const { title, children } = props;

    return (
        <header className="px-8 py-4 flex justify-between items-center border-b border-b-gray-200">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <div>
                {children}
            </div>
        </header>
    )
}
