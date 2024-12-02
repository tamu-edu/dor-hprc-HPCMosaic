import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../Components/ItemTypes';

const Card = ({ name, id, title, children }) => {
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

    return (
        <div 
            ref={drag}
            className={`p-4 shadow-md rounded-lg cursor-move ${isDragging ? 'opacity-50' : ''}`}
            style={{ width: 230, height: 180, margin: 10, backgroundColor: 'white' }}
        >
            <p className="font-bold text-center">{title}</p>
            {children && <div className="mt-2">{children}</div>}
        </div>
    );
};

export default Card;
