import { FormOutlined, Loading3QuartersOutlined, LoadingOutlined, PlusOutlined, SettingOutlined, SlidersOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Collapse, Drawer, Form, Input, List, message, Select, Tabs, Tag, Upload, Avatar } from 'antd';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import React, { Component } from 'react';
import { Fragment } from 'react/cjs/react.production.min';
import AccountAmount from '../components/AccountAmount';
import AccountIcon from '../components/AccountIcon';
import Icons from '../components/Icons';
import AccountSyncPriceDrawer from '../components/AccountSyncPriceDrawer';
import AccountTransactionDrawer from '../components/AccountTransactionDrawer';
import CommodityPriceChartDrawer from '../components/CommodityPriceChartDrawer';
import { fetch, getAccountCata, getAccountIcon, getAccountName } from '../config/Util';
import ThemeContext from '../context/ThemeContext';
import Page from './base/Page';
import './styles/Account.css';

const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const validateMessages = {
  required: '${label} 不能为空！'
};

const AccountList = ({ loading, accounts, onEdit, commodity }) => {
  const groupByAccountsDict = {}
  accounts.forEach(acc => {
    const typeKey = acc.type.key;
    const typeName = acc.type.name;
    const accGroup = groupByAccountsDict[typeName]
    if (accGroup) {
      accGroup.children.push(acc)
    } else {
      groupByAccountsDict[typeName] = { id: typeKey, name: typeName, children: [acc] }
    }
  })
  return (
    <Collapse ghost>
      {
        Object.values(groupByAccountsDict).map(groupByAccount => {
          const totalAmount = groupByAccount.children.map(acc => Decimal(acc.marketNumber || 0)).reduce((a, b) => a.plus(b))
          return <Panel key={groupByAccount.id} header={`${groupByAccount.children.length}个${groupByAccount.name}账户 (${commodity.symbol}${Math.abs(totalAmount)})`}>
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={groupByAccount.children}
              renderItem={item => {
                const actions = []
                if (item.marketNumber) {
                  actions.push(<div>{AccountAmount(item.account, item.marketNumber, item.marketCurrencySymbol)}</div>)
                }
                if (item.loading) {
                  actions.push(<LoadingOutlined />)
                } else {
                  actions.push(<a key="list-delete" onClick={() => { onEdit(item, !item.marketCurrency || (item.marketCurrency && (item.currency === item.marketCurrency))) }}>操作</a>)
                }
                return (
                  <List.Item
                    actions={actions}
                  >
                    <List.Item.Meta
                      avatar={<AccountIcon iconType={getAccountIcon(item.account)} />}
                      title={<div>{item.endDate && <Tag color="#f50">已关闭</Tag>}<span>{getAccountName(item.account)}</span></div>}
                      description={`${item.startDate}${item.endDate ? '~' + item.endDate : ''} ${item.currency || ''}`}
                    />
                  </List.Item>
                )
              }}
            />
          </Panel>
        })
      }
    </Collapse>
  )
}

class Account extends Component {

  theme = this.context.theme
  formRef = React.createRef();
  balanceFormRef = React.createRef();

  state = {
    loading: false,
    iconsLoading: false,
    drawerVisible: false,
    balanceDrawerVisible: false,
    accountDrawerVisible: false,
    accounts: [],
    icons: [],
    fetchAccountTypeloading: false,
    accountTypes: [],
    selectedAccountType: '',
    iconType: '',
    iconsShow: false,
    choiceIcon: '',
    selectedAccountTypePrefix: 'Assets',
    balanceAccount: null,
    editAccount: {},
    transactionDrawerVisible: false,
    syncPriceAccount: null,
    syncPriceDrawerVisible: false,
    // 被编辑的账户是同样的货币单位
    editAccountDiffCommodity: false,
    refreshLoading: false,
    commodityPriceDrawerVisible: false,
  }

  componentDidMount() {
    this.queryAllAccounts()
    this.queryAllAccountTypes()
  }


  queryAllIcon = () => {
    if (this.state.iconsLoading) {
      return
    }
    if (this.state.icons.length>0){
      return 
    }
    this.setState({ iconsLoading: true })
    fetch('/api/auth/icons/list')
      .then(icons => {
        this.setState({ icons })
      }).catch(console.error).finally(() => { this.setState({ iconsLoading: false }) })
  }

  queryAllAccounts = () => {
    this.setState({ loading: true })
    fetch('/api/auth/account/all')
      .then(accounts => {
        this.setState({ accounts })
      }).catch(console.error).finally(() => { this.setState({ loading: false }) })
  }

  queryAllAccountTypes = () => {
    this.setState({ fetchAccountTypeloading: true })
    fetch('/api/auth/account/type')
      .then(accountTypes => {
        this.setState({ accountTypes })
      }).catch(console.error).finally(() => { this.setState({ fetchAccountTypeloading: false }) })
  }

  handleChangeAccountType = (selectedAccountType) => {
    this.setState({ selectedAccountType })
  }

  handleChangeAccountTypePrefix = (selectedAccountTypePrefix) => {
    this.setState({ selectedAccountTypePrefix })
  }

  handleAddAccount = (values) => {
    this.setState({ loading: true })
    const { account, date, accountType, accountTypeName, currency, icon } = values
    if (this.state.selectedAccountType === 'Undefined') {
      const type = `${this.state.selectedAccountTypePrefix}:${accountType}`
      fetch('/api/auth/account/type', { method: 'POST', body: { type, name: accountTypeName } })
        .then(result => {
          this.setState({ drawerVisible: false, accountTypes: [result, ...this.state.accountTypes] });
          // 清空表单内容
          this.formRef.current.resetFields();
          message.success("添加成功")
        }).catch(console.error).finally(() => { this.setState({ loading: false }) })
    } else {
      const acc = `${this.state.selectedAccountType}:${account}`
      fetch('/api/auth/account', { method: 'POST', body: { account: acc, date, currency, icon } })
        .then(result => {
          this.setState({ drawerVisible: false, accounts: [result, ...this.state.accounts] });
          // 清空表单内容
          this.formRef.current.resetFields();
          message.success("添加成功")
        }).catch(console.error).finally(() => { this.setState({ loading: false }) })
    }
  };

  handleCloseAccount = () => {
    const account = this.state.editAccount.account;
    const accounts = this.state.accounts.map(acc => acc.account === account ? Object.assign({ loading: true }, acc) : acc)
    this.setState({ accounts })
    const date = dayjs().format('YYYY-MM-DD')
    fetch(`/api/auth/account/close`, { method: 'POST', body: { account, date } })
      .then(res => {
        const accounts = this.state.accounts.filter(acc => acc.account !== account)
        this.setState({ accounts })
      }).catch(console.error)
      .finally(() => { this.setState({ accountDrawerVisible: false, accounts: this.state.accounts.map(acc => { delete acc.loading; return acc; }) }) })
  }

  handleBalanceAccount = (values) => {
    this.setState({ loading: true })
    const account = this.state.balanceAccount
    fetch(`/api/auth/account/balance`, { method: 'POST', body: { ...values, account } })
      .then((res) => {
        const accounts = this.state.accounts.map(acc => {
          if (acc.account === res.account) {
            acc.marketNumber = res.marketNumber
            acc.marketCurrency = res.marketCurrency
            acc.marketCurrencySymbol = res.marketCurrencySymbol
            return acc
          }
          return acc
        })
        this.setState({ accounts })
        this.handleCloseBalanceDrawer()
        this.balanceFormRef.current.resetFields();
      }).catch(console.error).finally(() => { this.setState({ loading: false }) })
  }

  handleEditAccountInput = (value) => {
    const account = `${this.state.selectedAccountType}:${value.target.value}`
    this.setState({ iconType: getAccountIcon(account) })
  }
  handleIconClick=()=>{
    this.setState({iconsShow: !this.state.iconsShow})
  }

  handleEditIcon = (value) => {
    this.setState({ choiceIcon: value,iconsShow: false }, () => {
      this.formRef.current.setFieldsValue({ icon: value })
      console.log(this.formRef.current.getFieldsValue())
    })
  }

  handleOpenDrawer = () => {
    this.queryAllIcon()
    this.setState({ drawerVisible: true }, () => {
      this.formRef.current.setFieldsValue({ date: dayjs().format('YYYY-MM-DD') })
    })
  }

  handleCloseDrawer = () => {
    this.setState({ drawerVisible: false })
  }

  handleOpenBalanceDrawer = () => {
    this.setState({ balanceDrawerVisible: true, balanceAccount: this.state.editAccount.account }, () => {
      this.balanceFormRef.current.setFieldsValue({ date: dayjs().format('YYYY-MM-DD') })
    })
  }

  handleCloseBalanceDrawer = () => {
    this.setState({ balanceDrawerVisible: false, accountDrawerVisible: false, balanceAccount: null })
  }

  handleOpenSyncPriceDrawer = () => {
    this.setState({ syncPriceDrawerVisible: true, syncPriceAccount: this.state.editAccount })
  }

  handleCloseSyncPriceDrawer = () => {
    this.setState({ syncPriceDrawerVisible: false, accountDrawerVisible: false, syncPriceAccount: null })
  }

  handleOpenAccountDrawer = (account, editAccountDiffCommodity) => {
    this.setState({ accountDrawerVisible: true, editAccount: account, editAccountDiffCommodity })
  }

  handleCloseAccountDrawer = () => {
    this.setState({ accountDrawerVisible: false })
  }

  handleChangeFile = (info) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`);
      this.setState({ accountDrawerVisible: false })
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
  }

  handleOpenTransactionDrawer = () => {
    this.setState({ transactionDrawerVisible: true })
  }

  handleCloseTransactionDrawer = () => {
    this.setState({ transactionDrawerVisible: false, accountDrawerVisible: false, transactions: [] })
  }

  handleOpenCommodityPriceDrawer = () => {
    this.setState({ commodityPriceDrawerVisible: true })
  }

  handleCloseCommodityPriceDrawer = () => {
    this.setState({ commodityPriceDrawerVisible: false })
  }

  handleRefreshAccountCache = () => {
    this.setState({ refreshLoading: true })
    fetch('/api/auth/account/refresh', { method: 'POST' })
      .then(() => {
        message.success("缓存已更新");
        this.queryAllAccounts()
        this.queryAllAccountTypes()
        this.setState({ icons: [] })
      })
      .finally(() => { this.setState({ refreshLoading: false }) })
  }

  render() {
    if (this.context.theme !== this.theme) {
      this.theme = this.context.theme
    }
    const { accounts, loading, drawerVisible, balanceDrawerVisible, accountTypes, iconType, selectedAccountType,
      selectedAccountTypePrefix, accountDrawerVisible, editAccount, transactionDrawerVisible, syncPriceDrawerVisible } = this.state

    return (
      <div className="account-page">
        <div className="button-wrapper">
          <div>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={this.handleOpenDrawer}>
              添加账户
            </Button>
            &nbsp;&nbsp;
            <Button size="small" loading={this.state.refreshLoading} icon={<Loading3QuartersOutlined />} onClick={this.handleRefreshAccountCache}>
              刷新缓存
            </Button>
          </div>
          <div>
            <Button type="text" size="small" icon={<SlidersOutlined />} onClick={() => { this.setState({ commodityPriceDrawerVisible: true }) }}>
              汇率曲线
            </Button>
            <Button type="text" size="small" icon={<FormOutlined />} onClick={() => { this.props.history.push('/edit') }}>
              编辑源文件
            </Button>
            <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => { this.props.history.push('/setting') }}>
              设置
            </Button>
          </div>
        </div>
        <Drawer
          title="新增账户"
          placement="bottom"
          closable={true}
          onClose={this.handleCloseDrawer}
          open={drawerVisible}
          height="540"
          className="page-drawer"
          bodyStyle={{ display: 'flex', justifyContent: 'center' }}
        >
          <Form
            name="add-account-form"
            className="page-form"
            size="large"
            style={{ textAlign: 'left' }}
            ref={this.formRef}
            onFinish={this.handleAddAccount}
            validateMessages={validateMessages}
          >
            <Form.Item
              name="type"
              label=" 分类"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                placeholder="分类"
                optionFilterProp="children"
                onChange={this.handleChangeAccountType}
              >
                <Option value="Undefined">+ 新增账户分类</Option>
                {
                  accountTypes.map(acc => <Option key={acc.key} value={acc.key}>{`${acc.key.slice(0, acc.key.indexOf(":"))}:${acc.name}`}</Option>)
                }
              </Select>
            </Form.Item>
            {
              selectedAccountType === 'Undefined' ?
                <Form.Item
                  name="accountTypeName"
                  label="分类名称"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="账户分类的名称，如购物，美食，订阅" />
                </Form.Item> :
                <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                  <Input type="date" placeholder="时间" />
                </Form.Item>
            }
            {
              selectedAccountType === 'Undefined' ?
                <Form.Item
                  name="accountType"
                  label="账户分类"
                  rules={[{ required: true }]}
                >
                  <Input
                    addonBefore={
                      <Select defaultValue={selectedAccountTypePrefix} onChange={this.handleChangeAccountTypePrefix}>
                        <Option value="Assets">资产</Option>
                        <Option value="Income">收入</Option>
                        <Option value="Expenses">支出</Option>
                        <Option value="Liabilities">负债</Option>
                        <Option value="Equity">权益</Option>
                      </Select>
                    }
                    placeholder="账户分类，如 Shopping"
                  />
                </Form.Item> :
                <Form.Item
                  name="account"
                  label="账户"
                  rules={[{ required: true }]}
                >
                  <Input
                    placeholder="账户名称，如 ICBC:工商银行"
                    addonAfter={<Form.Item name="icon" noStyle><AccountIcon icons={this.state.icons} iconType={this.state.choiceIcon ? this.state.choiceIcon : getAccountIcon(iconType)} 
                        onClick={this.handleIconClick}
                        /></Form.Item>}
                    onChange={this.handleEditAccountInput}
                  />
                </Form.Item>
            }
            {
              <Form.Item
              visible={this.state.iconsShow}
              style={{display: this.state.iconsShow?'block':'none'}}
            >
                  <Icons icons={this.state.icons} onChange={this.handleEditIcon} />
              </Form.Item>
            }
            {
              selectedAccountType !== 'Undefined' &&
              <Form.Item
                name="currency"
                label="币种"
                rules={[{ required: true }]}
                initialValue={this.props.commodity.currency}
              >
                <Input placeholder="账户使用的货币单位" />
              </Form.Item>
            }
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="submit-button">
                添加账户
              </Button>
            </Form.Item>
          </Form>
        </Drawer>
        <div>
          <Tabs defaultActiveKey="Assets">
            <TabPane tab="资产账户" key="1">
              <AccountList loading={loading} {...this.props} accounts={accounts.filter(acc => getAccountCata(acc.account) === "Assets")} onEdit={this.handleOpenAccountDrawer} />
            </TabPane>
            <TabPane tab="收入账户" key="Income">
              <AccountList loading={loading} {...this.props} accounts={accounts.filter(acc => getAccountCata(acc.account) === "Income")} onEdit={this.handleOpenAccountDrawer} />
            </TabPane>
            <TabPane tab="支出账户" key="Expenses">
              <AccountList loading={loading} {...this.props} accounts={accounts.filter(acc => getAccountCata(acc.account) === "Expenses")} onEdit={this.handleOpenAccountDrawer} />
            </TabPane>
            <TabPane tab="负债账户" key="Liabilities">
              <AccountList loading={loading} {...this.props} accounts={accounts.filter(acc => getAccountCata(acc.account) === "Liabilities")} onEdit={this.handleOpenAccountDrawer} />
            </TabPane>
            <TabPane tab="权益账户" key="Equity">
              <AccountList loading={loading} {...this.props} accounts={accounts.filter(acc => getAccountCata(acc.account) === "Equity")} onEdit={this.handleOpenAccountDrawer} />
            </TabPane>
          </Tabs>
        </div>
        <div>
          <Drawer
            title={`核算账户：${this.state.balanceAccount}`}
            placement="bottom"
            closable={true}
            onClose={this.handleCloseBalanceDrawer}
            open={balanceDrawerVisible}
            className="page-drawer"
            height="60vh"
            bodyStyle={{ display: 'flex', justifyContent: 'center' }}
          >
            <Form
              name="balance-account-form"
              className="page-form"
              size="large"
              style={{ textAlign: 'left' }}
              ref={this.balanceFormRef}
              onFinish={this.handleBalanceAccount}
              validateMessages={validateMessages}
            >
              <Form.Item name="date" rules={[{ required: true }]}>
                <Input type="date" placeholder="时间" />
              </Form.Item>
              <Form.Item name="number" rules={[{ required: true }]}>
                <Input type="number" step="0.01" placeholder="金额" addonAfter={this.state.editAccount.currency} />
              </Form.Item>
              <Form.Item>
                <Alert type="info" message="核算账户前，请确保 Equity:OpeningBalances 账户存在" showIcon />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} className="submit-button">
                  核算
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
          <Drawer
            title={`账户：${this.state.editAccount.account}`}
            placement="bottom"
            closable={true}
            onClose={this.handleCloseAccountDrawer}
            open={accountDrawerVisible}
            className="page-drawer"
            height="60vh"
            bodyStyle={{ display: 'flex', justifyContent: 'center' }}
          >
            <div className="page-form">
              <Upload style={{ display: 'block' }}
                name='file'
                action={`/api/auth/account/icon?account=${editAccount.account}`}
                headers={{ ledgerId: window.localStorage.getItem("ledgerId") }}
                onChange={this.handleChangeFile}
              >
                <Button size="large" loading={loading} icon={<UploadOutlined />} style={{ width: '100%' }} >
                  更换ICON
                </Button>
              </Upload>
              <div style={{ height: '1rem' }}></div>
              <Button size="large" style={{ width: '100%' }} onClick={this.handleOpenTransactionDrawer}>
                交易记录
              </Button>
              <div style={{ height: '1rem' }}></div>
              <Button size="large" style={{ width: '100%' }} onClick={this.handleOpenBalanceDrawer}>
                核算账户
              </Button>
              {
                !this.state.editAccountDiffCommodity && <Fragment>
                  <div style={{ height: '1rem' }}></div>
                  <Button size="large" style={{ width: '100%' }} onClick={this.handleOpenSyncPriceDrawer}>
                    同步净值
                  </Button>
                </Fragment>
              }
              <div style={{ height: '1rem' }}></div>
              <Button size="large" type="danger" loading={loading} className="submit-button" onClick={this.handleCloseAccount}>
                关闭账户
              </Button>
            </div>
          </Drawer>
        </div>
        <AccountTransactionDrawer
          account={this.state.editAccount.account}
          open={transactionDrawerVisible}
          onClose={this.handleCloseTransactionDrawer}
        />
        <AccountSyncPriceDrawer
          account={this.state.editAccount}
          open={syncPriceDrawerVisible}
          onClose={this.handleCloseSyncPriceDrawer}
        />
        <CommodityPriceChartDrawer
          open={this.state.commodityPriceDrawerVisible}
          onClose={this.handleCloseCommodityPriceDrawer}
        />
      </div >
    );
  }
}

Account.contextType = ThemeContext

export default Page(Account);
