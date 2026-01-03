const Dot = ({variant}) => {
    const colors = {
        red: "bg-red-500",
        green: "bg-green-500"
    }

    return (
        <div className={`w-3 h-3 rounded-full ${colors[variant]} animate-pulse`}></div>
    )
}
export default Dot