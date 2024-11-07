import React from 'react'
import { useDrag } from 'react-dnd';
import {ItemTypes} from './ItemTypes'
const Card=(props)=>{
    const [{ isDragging }, drag] = useDrag({
		item: {
			type: ItemTypes.CARD,
            id: props._id,
            name:props.name
		},
		collect: monitor => ({
			isDragging: !!monitor.isDragging(),
		}),
	});
    return(
        <div ref={drag} style={{color:"white",border:"1px solid white",padding:10,margin:10}}>
            {props.name}
        </div>
    )
}

export default Card