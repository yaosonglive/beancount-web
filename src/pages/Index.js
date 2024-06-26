import { AccountBookOutlined, CloudUploadOutlined, EyeInvisibleOutlined, EyeOutlined, FormOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Button, Col, Empty, List, Row, Spin, Tabs, Tag, Space } from 'antd';
import dayjs from 'dayjs';
import React, { Component } from 'react';
import AccountAmount from '../components/AccountAmount';
import AccountIcon from '../components/AccountIcon';
import AccountTransactionDrawer from '../components/AccountTransactionDrawer';
import AddTransactionDrawer from '../components/AddTransactionDrawer';
import CalendarDrawer from '../components/CalendarDrawer';
import MonthSelector from '../components/MonthSelector';
import StatisticAmount from '../components/StatisticAmount';
import TagTransactionDrawer from '../components/TagTransactionDrawer';
import { AccountTypeDict, fetch, getAccountIcon, getAccountName } from '../config/Util';
import ThemeContext from '../context/ThemeContext';
import Page from './base/Page';
import './styles/Index.css';


const TransactionList = ({ loading, transactionGroups, type, onOpenAccountDrawer, onOpenTagDrawer }) => (
  <div style={{ minHeight: '400px' }}>
    {
      (!loading && transactionGroups.length === 0) ? < Empty description={`无${AccountTypeDict[type]}内容`} /> :
        <Spin tip="加载中..." style={{ marginTop: '1rem' }} spinning={loading}>
          {
            transactionGroups.map(group => (
              <List
                split={false}
                key={group.date}
                header={<div>{dayjs(group.date).format('YYYY年M月D号')}&nbsp;&nbsp;{group.date === dayjs().format('YYYY-MM-DD') && <Tag color="#1DA57A">今天</Tag>}</div>}
                itemLayout="horizontal"
                dataSource={group.children}
                renderItem={item => (
                  <List.Item
                    actions={[
                      item.number ? <div>{AccountAmount(item.account, item.number, item.currencySymbol, item.currency)}</div> : ''
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<AccountIcon iconType={getAccountIcon(item.account)} />}
                      title={item.desc}
                      description={
                        <div>
                          {
                            item.tags && <div>{item.tags.map(t => <a style={{ marginRight: '4px' }} onClick={() => onOpenTagDrawer(t)}>#{t}</a>)}</div>
                          }
                          {item.date}&nbsp;
                          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { onOpenAccountDrawer(item.account) }}>{getAccountName(item.account)}</span>
                          &nbsp;{item.payee}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ))
          }
        </Spin>
    }
  </div>
)
class Index extends Component {

  theme = this.context.theme
  formRef = React.createRef();
  ledgerId = window.localStorage.getItem("ledgerId")
  currentMonth = dayjs().format('YYYY-M')

  state = {
    loading: false,
    hideMoney: JSON.parse(window.localStorage.getItem("hideMoney") || 'false'),
    Income: 0,
    Expenses: 0,
    Liabilities: 0,
    listLoading: false,
    type: 'Expenses',
    transactionDateGroup: {},
    // 所有记账的月份，初始化当月
    selectedMonth: this.currentMonth,
    addTransactionDrawerVisible: false,
    accountTransactionDrawerVisible: false,
    selectedAccount: null,
    tagTransactionDrawerVisible: false,
    selectedTag: null,
    // 账单日历
    calendarDrawerVisible: false,
  }

  componentDidMount() {
    if (!window.localStorage.getItem("ledgerId")) {
      this.props.history.replace('/ledger')
    } else {
      this.queryMonthStats();
      this.queryTransactionList();
    }
  }

  queryMonthStats = () => {
    this.setState({ loading: true })
    fetch(`/api/auth/stats/total?year=${dayjs(this.state.selectedMonth).year()}&month=${this.state.selectedMonth.length > 4 ? dayjs(this.state.selectedMonth).month() + 1 : ''}`)
      .then(res => {
        const { Income = 0, Expenses = 0, Liabilities = 0, Assets = 0 } = res;
        this.setState({ Income, Expenses, Liabilities, Assets })
      }).catch(console.error).finally(() => { this.setState({ loading: false }) })
  }

  queryTransactionList = () => {
    const { type, selectedMonth } = this.state
    this.setState({ listLoading: true })
    fetch(`/api/auth/transaction?type=${type}&year=${dayjs(selectedMonth).year()}&month=${this.state.selectedMonth.length > 4 ? dayjs(selectedMonth).month() + 1 : ''}`)
      .then(transactionList => {
        const transactionDateGroup = {}
        transactionList.forEach(transaction => {
          const date = transaction.date;
          const transactionGroup = transactionDateGroup[date]
          if (transactionGroup) {
            transactionGroup.children.push(transaction)
          } else {
            transactionDateGroup[date] = { date, children: [transaction] }
          }
        })
        this.setState({ transactionDateGroup })
      }).catch(console.error).finally(() => { this.setState({ listLoading: false }) })
  }

  handleChangeEntryType = (type) => {
    this.setState({ type }, () => {
      this.queryTransactionList();
    })
  }

  handleChangeMonth = (selectedMonth) => {
    this.setState({ selectedMonth }, () => {
      this.queryMonthStats();
      this.queryTransactionList();
    })
  }

  handleOpenDrawer = () => {
    this.setState({ addTransactionDrawerVisible: true })
  }

  handleCloseDrawer = () => {
    this.setState({ addTransactionDrawerVisible: false })
  }

  handleNavigateImportPage = () => {
    this.props.history.replace('./import')
  }

  handleAddTransaction = () => {
    this.queryMonthStats()
    this.queryTransactionList()
    this.handleCloseDrawer()
  }

  handleHideMoney = () => {
    const hideMoney = !this.state.hideMoney
    this.setState({ hideMoney })
    window.localStorage.setItem('hideMoney', hideMoney)
  }

  handleOpenAccountTransactionDrawer = (selectedAccount) => {
    this.setState({ accountTransactionDrawerVisible: true, selectedAccount })
  }

  handleCloseAccountTransactionDrawer = () => {
    this.setState({ accountTransactionDrawerVisible: false })
  }

  handleOpenTagTransactionDrawer = (selectedTag) => {
    this.setState({ tagTransactionDrawerVisible: true, selectedTag })
  }

  handleCloseTagTransactionDrawer = () => {
    this.setState({ tagTransactionDrawerVisible: false })
  }

  handleOpenCalendarDrawer = () => {
    this.setState({ calendarDrawerVisible: true })
  }

  handleCloseCalendarDrawer = () => {
    this.setState({ calendarDrawerVisible: false })
  }

  render() {
    if (this.context.theme !== this.theme) {
      this.theme = this.context.theme
    }

    const { loading, listLoading, transactionDateGroup, addTransactionDrawerVisible, hideMoney, accountTransactionDrawerVisible, tagTransactionDrawerVisible } = this.state
    const transactionGroups = Object.values(transactionDateGroup);
    const items = [
      { label: '收入明细', key: 'Income', 
        children: (<TransactionList
          type={'Income'}
          loading={listLoading}
          transactionGroups={transactionGroups}
          onOpenAccountDrawer={this.handleOpenAccountTransactionDrawer}
          onOpenTagDrawer={this.handleOpenTagTransactionDrawer}
        />)
      },
      { label: '支出明细', key: 'Expenses', children: (<TransactionList
        type={'Expenses'}
        loading={listLoading}
        transactionGroups={transactionGroups}
        onOpenAccountDrawer={this.handleOpenAccountTransactionDrawer}
        onOpenTagDrawer={this.handleOpenTagTransactionDrawer}
      />) },
      { label: '负债明细', key: 'Liabilities', children: (<TransactionList
        type={'Liabilities'}
        loading={listLoading}
        transactionGroups={transactionGroups}
        onOpenAccountDrawer={this.handleOpenAccountTransactionDrawer}
        onOpenTagDrawer={this.handleOpenTagTransactionDrawer}
      />) },
    ];
    
    return (
      <div className="index-page page">
        <div className="top-wrapper">
          <Space size={5} wrap>
            <MonthSelector value={this.state.selectedMonth} onChange={this.handleChangeMonth} />
            {hideMoney ? <Button size="small" icon={<EyeInvisibleOutlined />} onClick={this.handleHideMoney}></Button> : <Button size="small" icon={<EyeOutlined />} onClick={this.handleHideMoney}></Button>}
            <Button size="small" icon={<AccountBookOutlined />} onClick={this.handleOpenCalendarDrawer}>日历</Button>
            <Button size="small" icon={<CloudUploadOutlined />} onClick={this.handleNavigateImportPage}>导入</Button>
            <Button type="primary" size="small" icon={<FormOutlined />} onClick={this.handleOpenDrawer}>记账</Button>
            {this.state.Assets > 0 && !hideMoney && <Tag icon={<RiseOutlined />} color="#f50" >月资产：{AccountAmount('Assets:', this.state.Assets)}</Tag>}
            {this.state.Assets < 0 && !hideMoney && <Tag icon={<FallOutlined />} color="#1DA57A">月资产：{AccountAmount('Assets:', this.state.Assets)}</Tag>}
          </Space>

        </div>
        <div style={{ textAlign: 'center' }}>
          <Row>
            <Col span={8}>
              <StatisticAmount hide={hideMoney} title={`本月${AccountTypeDict['Income']}`} value={Math.abs(this.state.Income)} loading={loading} prefix={this.state.Income > 0 ? '-' : '+'} valueStyle={{ color: '#cf1322' }} />
            </Col>
            <Col span={8}>
              <StatisticAmount hide={hideMoney} title={`本月${AccountTypeDict['Expenses']}`} value={Math.abs(this.state.Expenses)} loading={loading} prefix={this.state.Expenses >= 0 ? '-' : '+'} valueStyle={{ color: '#3f8600' }} />
            </Col>
            <Col span={8}>
              <StatisticAmount hide={hideMoney} title={`本月${AccountTypeDict['Liabilities']}`} value={Math.abs(this.state.Liabilities)} loading={loading} prefix={this.state.Liabilities > 0 ? '+' : '-'} valueStyle={{ color: '#3f8600' }} />
            </Col>
          </Row>
        </div>
        <Tabs items={items} defaultActiveKey="Expenses" onChange={this.handleChangeEntryType} style={{ marginTop: '1rem' }}/>

        <AddTransactionDrawer
          {...this.props}
          open={addTransactionDrawerVisible}
          onClose={this.handleCloseDrawer}
          onSubmit={this.handleAddTransaction}
        />
        {
          this.state.selectedAccount &&
          <AccountTransactionDrawer
            account={this.state.selectedAccount}
            open={accountTransactionDrawerVisible}
            onClose={this.handleCloseAccountTransactionDrawer}
          />
        }
        {
          this.state.selectedTag &&
          <TagTransactionDrawer
            tag={this.state.selectedTag}
            open={tagTransactionDrawerVisible}
            onClose={this.handleCloseTagTransactionDrawer}
          />
        }
        {
          this.state.selectedMonth &&
          <CalendarDrawer
            month={this.state.selectedMonth}
            open={this.state.calendarDrawerVisible}
            onClose={this.handleCloseCalendarDrawer}
          />
        }
      </div>
    );
  }
}

Index.contextType = ThemeContext

export default Page(Index);
