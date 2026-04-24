import React from 'react'
import QuotaButton from './QuotaButton'
import GroupButton from './GroupButton'
import HelpButton from './HelpButton'
// add any other imports as required

const ButtonTesting = () => {
    return (
	    <div className="p-4 theme-surface w-full h-full flex flex-col">
      <QuotaButton/>
      <GroupButton/>
      <HelpButton/>
    </div>
  )
}

export default ButtonTesting
