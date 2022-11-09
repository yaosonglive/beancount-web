import React from 'react'

class Icons extends React.Component {

    state={
        currentIcon: '',
    }
    changeIcon=(value)=>{
        this.setState({currentIcon: value.target.getAttribute('value')})
        this.props.onChange(value.target.getAttribute('value'))
    }
    render() {
        const icons = this.props.icons
        return (
            icons.map((v)=>{
                return <img src={`../../web/icons/${v}.png`} value={v} alt="" width={32} height={32} 
                onClick={this.changeIcon} 
                style={{ padding: '2px' }}
                />
            })
        )
    }
}

export default Icons