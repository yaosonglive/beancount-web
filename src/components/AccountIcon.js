import React from 'react'

const AccountIcon = ({ icons, iconType, ...rest }) => {
    let exists = true
    if (Array.isArray(icons)){
        let findIcons = icons.filter((value) => value === iconType)
        exists = findIcons.length>0
    }
    return (
        <img {...rest} src={`../../web/icons/${iconType && exists?iconType:'Default'}.png`} alt="" width={32} height={32} />
    )
}
export default AccountIcon