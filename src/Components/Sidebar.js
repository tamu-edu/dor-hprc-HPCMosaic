import React from 'react';
import CardConfig from './CardConfig';

const Sidebar = () => {
    const list = Object.keys(CardConfig);

    return (
        <div className="w-full p-4 rounded-t-md flex flex-col items-start space-y-4">
            <div className="flex flex-row space-y-3 w-full">
                {list.map((name, id) => {
                    const { cardComponent: CardComponent, image } = CardConfig[name];
                    return <CardComponent key={id} name={name} _id={id} image={image} />;
                })}
            </div>
        </div>
    );
};

export default Sidebar;
