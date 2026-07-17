export default function DropdownMenu({ title, items }) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button>{title}</button>

            {open && (
                <div className="absolute top-full mt-2 w-56 rounded-xl bg-white shadow-lg">
                    {items.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="block px-4 py-2 hover:bg-gray-100"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}