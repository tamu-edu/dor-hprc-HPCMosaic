import React from 'react'
import { useDrag } from 'react-dnd';
import {ItemTypes} from '../Components/ItemTypes'
import Bar from '../Images/bar.jpg'
const BarCard=(props)=>{
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
        <img ref={drag} width={230} height={180} src={Bar}></img>
    </div>
    )
}

export default BarCard