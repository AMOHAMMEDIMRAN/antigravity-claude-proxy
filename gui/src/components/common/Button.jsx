const Button = ({
    children,
    onClick,
    className = "",
    variant = "primary",
    disabled = false,
    type = "button",
    ...props
}) => {
    const variants = {
        primary: "bg-[#d97757] text-white hover:bg-[#c16647] disabled:bg-gray-300",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
        outline: "border-2 border-[#d97757] text-[#d97757] hover:bg-[#d97757] hover:text-white disabled:border-gray-300 disabled:text-gray-300",
        danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300"
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
export default Button