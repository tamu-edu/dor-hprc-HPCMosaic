import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "../Components/ItemTypes";

const Card = React.memo(({ name, id, title, icon, description }) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CARD,
        item: () => {
            console.log(`🛠️ Dragging Card: ${name}`); // ✅ Log card name correctly
            return { id, name }; // ✅ Return correct item
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    return (
        <div
            ref={drag}
            className={`p-8 shadow-md border border-gray-300 rounded-lg cursor-move flex flex-col items-center justify-center transition duration-300 ${
                isDragging ? "opacity-50" : "bg-white hover:shadow-xl"
            }`}
            style={{ width: 280, height: 240, margin: 12 }}
        >
            <div className="text-blue-500 text-5xl">{icon}</div> 
            <h3 className="text-xl font-semibold mt-3 text-center">{title}</h3>
            <p className="text-gray-600 text-lg text-center mt-2">{description}</p> 
        </div>
    );
});

export default Card;
