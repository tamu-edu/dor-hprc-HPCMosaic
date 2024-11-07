import React from 'react';
import PlaceHolder from './Components/PlaceHolder';
import { DndProvider } from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';

function SandboxGrid() {
  return (
    <div className="">
      <DndProvider backend={HTML5Backend}>
      <PlaceHolder></PlaceHolder>
      </DndProvider>
    </div>
  );
}

export default SandboxGrid;