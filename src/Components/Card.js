import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../Components/ItemTypes';

const Card = React.memo(({ name, id, title, image }) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CARD,
        item: {
            id,
            name,
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    console.log("Rendering Card:", { name, title, image }); // Debug log

    return (
        <div 
            ref={drag}
            className={`p-4 shadow-md rounded-lg cursor-move ${isDragging ? 'opacity-50' : ''}`}
            style={{ width: 230, height: 180, margin: 10, backgroundColor: 'white' }}
        >
            {image ? (
                <div className="mb-2 flex justify-center">
                    <img src={image} alt={`${title} Icon`} className="w-12 h-12" />
                </div>
            ) : (
                <div className="mb-2 flex justify-center text-gray-400">No Image</div>
            )}
            <p className="font-bold text-center">{title}</p>
        </div>
    );
});

export default Card;