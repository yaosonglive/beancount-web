
class Icons extends Component {
  state = {
    loading: false,
    icons: [],
  }
  queryAllIcon = () => {
    this.setState({ loading: true })
    fetch('/api/auth/icons/list')
      .then(icons => {
        this.setState({ icons })
      }).catch(console.error).finally(() => { this.setState({ loading: false }) })
  }
}
  
export default Page(Icons);
