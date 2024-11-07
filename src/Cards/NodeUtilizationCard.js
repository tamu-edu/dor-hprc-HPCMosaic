import React from 'react'
import { useDrag } from 'react-dnd';
import {ItemTypes} from '../Components/ItemTypes'

const NodeUtilizationCard=(props)=>{
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CARD, // Ensure this is correctly defined
        item: {
            id: props._id,
            name: props.name,
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });
    return(
        <div  style={{color:"white",margin:10}}>
            <p className="p-4 shadow-md" ref={drag} width={230} height={180}>Node Utilization</p>
        </div>
    )
}

export default NodeUtilizationCard