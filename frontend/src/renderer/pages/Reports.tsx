import React, { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  Statistic,
  Space,
  Tabs,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sankey,
  Layer,
  Rectangle,
} from 'recharts';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import apiClient from '../api/client';
import { Account } from '../../shared/types';

// Extend dayjs with quarter support
dayjs.extend(quarterOfYear);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Default colors for charts
const COLORS = [
  '#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16',
  '#13c2c2', '#f5222d', '#faad14', '#2f54eb', '#a0d911',
  '#ff85c0', '#87e8de', '#b37feb', '#ffd666', '#5cdbd3',
];

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);

  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  // Fetch spending by category
  const { data: spendingData, isLoading: spendingLoading } = useQuery({
    queryKey: ['reports-spending', dateRange[0]?.format('YYYY-MM-DD'), dateRange[1]?.format('YYYY-MM-DD'), selectedAccountId],
    queryFn: () =>
      apiClient.getSpendingByCategory({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
        account_id: selectedAccountId,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  // Fetch income vs expenses
  const { data: incomeExpenseData, isLoading: incomeExpenseLoading } = useQuery({
    queryKey: ['reports-income-expense', dateRange[0]?.format('YYYY-MM-DD'), dateRange[1]?.format('YYYY-MM-DD'), selectedAccountId],
    queryFn: () =>
      apiClient.getIncomeVsExpenses({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
        account_id: selectedAccountId,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  // Fetch account balances
  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['reports-balances'],
    queryFn: () => apiClient.getAccountBalances(),
  });

  // Fetch money flow for Sankey diagram
  const { data: moneyFlowData, isLoading: moneyFlowLoading } = useQuery({
    queryKey: ['reports-money-flow', dateRange[0]?.format('YYYY-MM-DD'), dateRange[1]?.format('YYYY-MM-DD'), selectedAccountId],
    queryFn: () =>
      apiClient.getMoneyFlow({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
        account_id: selectedAccountId,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // Prepare pie chart data
  const pieChartData = spendingData?.categories?.map((cat: any, index: number) => ({
    name: cat.name,
    value: cat.amount,
    color: cat.color || COLORS[index % COLORS.length],
  })) || [];

  // Prepare bar chart data for income vs expenses comparison
  const barChartData = incomeExpenseData
    ? [
        { name: 'Income', amount: incomeExpenseData.income, fill: '#52c41a' },
        { name: 'Expenses', amount: incomeExpenseData.expenses, fill: '#ff4d4f' },
        { name: 'Net', amount: incomeExpenseData.net, fill: incomeExpenseData.net >= 0 ? '#1890ff' : '#ff4d4f' },
      ]
    : [];

  // Prepare account balance chart data
  const balanceChartData = balancesData?.accounts?.map((acc: any) => ({
    name: acc.name,
    balance: acc.balance,
    fill: acc.balance >= 0 ? '#52c41a' : '#ff4d4f',
  })) || [];

  const tabItems = [
    {
      key: 'spending',
      label: (
        <Space>
          <PieChartOutlined />
          Spending by Category
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Spending Distribution">
              {spendingLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Spin />
                </div>
              ) : pieChartData.length === 0 ? (
                <Empty description="No spending data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ paddingTop: 20 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Top Spending Categories">
              {spendingLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Spin />
                </div>
              ) : pieChartData.length === 0 ? (
                <Empty description="No spending data" />
              ) : (
                <div>
                  {spendingData?.categories?.slice(0, 10).map((cat: any, index: number) => (
                    <div
                      key={cat.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < 9 ? '1px solid var(--ant-color-border-secondary, #f0f0f0)' : 'none',
                      }}
                    >
                      <Space>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: cat.color || COLORS[index % COLORS.length],
                          }}
                        />
                        <Text>{cat.name}</Text>
                      </Space>
                      <Space>
                        <Text strong>
                          ${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text type="secondary">({cat.percentage}%)</Text>
                      </Space>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>Total Spending</Text>
                      <Text strong style={{ color: '#ff4d4f' }}>
                        ${spendingData?.total_spending?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'income-expense',
      label: (
        <Space>
          <BarChartOutlined />
          Income vs Expenses
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Income"
                    value={incomeExpenseData?.income || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#52c41a' }}
                    suffix={<ArrowUpOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Expenses"
                    value={incomeExpenseData?.expenses || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#ff4d4f' }}
                    suffix={<ArrowDownOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Net Savings"
                    value={incomeExpenseData?.net || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: (incomeExpenseData?.net || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                    suffix={<DollarOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Income vs Expenses Comparison">
              {incomeExpenseLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Spin />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Savings Rate">
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Title
                  level={1}
                  style={{
                    margin: 0,
                    color: (incomeExpenseData?.savings_rate || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {incomeExpenseData?.savings_rate?.toFixed(1) || 0}%
                </Title>
                <Text type="secondary">of income saved</Text>
                <div style={{ marginTop: 24 }}>
                  <Text>
                    {(incomeExpenseData?.savings_rate || 0) >= 20
                      ? '🎉 Great job! You\'re saving more than 20% of your income.'
                      : (incomeExpenseData?.savings_rate || 0) >= 10
                      ? '👍 Good progress! Try to increase your savings rate.'
                      : (incomeExpenseData?.savings_rate || 0) >= 0
                      ? '💡 Consider ways to reduce expenses or increase income.'
                      : '⚠️ You\'re spending more than you earn. Review your budget.'}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'balances',
      label: (
        <Space>
          <LineChartOutlined />
          Account Balances
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Assets"
                    value={balancesData?.total_assets || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Liabilities"
                    value={balancesData?.total_liabilities || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Net Worth"
                    value={balancesData?.net_worth || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: (balancesData?.net_worth || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24}>
            <Card title="Account Balances">
              {balancesLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Spin />
                </div>
              ) : balanceChartData.length === 0 ? (
                <Empty description="No accounts" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={balanceChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip
                      formatter={(value: number) =>
                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                      {balanceChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'money-flow',
      label: (
        <Space>
          <NodeIndexOutlined />
          Money Flow
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Income"
                    value={moneyFlowData?.total_income || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#52c41a' }}
                    suffix={<ArrowUpOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Expenses"
                    value={moneyFlowData?.total_expenses || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#ff4d4f' }}
                    suffix={<ArrowDownOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Net Savings"
                    value={moneyFlowData?.savings || 0}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: (moneyFlowData?.savings || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                    suffix={<DollarOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24}>
            <Card title="Money Flow Diagram">
              {moneyFlowLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Spin />
                </div>
              ) : !moneyFlowData?.nodes?.length || !moneyFlowData?.links?.length ? (
                <Empty description="No transaction data for this period. Add some income and expense transactions to see the money flow." />
              ) : (
                <div style={{ width: '100%', height: 600 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={{
                        nodes: moneyFlowData.nodes.map((node: any) => ({
                          name: node.name,
                          color: node.color,
                        })),
                        links: moneyFlowData.links.map((link: any) => ({
                          ...link,
                          sourceColor: moneyFlowData.nodes[link.source]?.color,
                          targetColor: moneyFlowData.nodes[link.target]?.color,
                        })),
                      }}
                      node={({ x, y, width, height, index, payload }: any) => {
                        const node = moneyFlowData.nodes[index];
                        const isIncome = node?.type === 'income';
                        const isMiddle = node?.type === 'budget';
                        const isRightSide = node?.type === 'expense' || node?.type === 'savings';
                        
                        // Calculate label position
                        let labelX = x - 8;
                        let labelAnchor: 'start' | 'middle' | 'end' = 'end';
                        if (isIncome) {
                          labelX = x - 8;
                          labelAnchor = 'end';
                        } else if (isRightSide) {
                          labelX = x + width + 8;
                          labelAnchor = 'start';
                        }
                        
                        return (
                          <Layer key={`node-${index}`}>
                            {/* Gradient definition for node */}
                            <defs>
                              <linearGradient id={`nodeGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={node?.color || '#8884d8'} stopOpacity={1} />
                                <stop offset="100%" stopColor={node?.color || '#8884d8'} stopOpacity={0.7} />
                              </linearGradient>
                            </defs>
                            <Rectangle
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={`url(#nodeGradient-${index})`}
                              stroke={node?.color || '#8884d8'}
                              strokeWidth={1}
                              radius={3}
                            />
                            {/* Label for non-middle nodes */}
                            {!isMiddle && (
                              <text
                                x={labelX}
                                y={y + height / 2}
                                textAnchor={labelAnchor}
                                dominantBaseline="middle"
                                fill="var(--ant-color-text, #fff)"
                                fontSize={12}
                                fontWeight={500}
                              >
                                {payload.name}
                              </text>
                            )}
                            {/* Center label for budget node - positioned above */}
                            {isMiddle && (
                              <>
                                <text
                                  x={x + width / 2}
                                  y={y - 20}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="var(--ant-color-text, #fff)"
                                  fontSize={14}
                                  fontWeight={600}
                                >
                                  {payload.name}
                                </text>
                                <text
                                  x={x + width / 2}
                                  y={y - 6}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#52c41a"
                                  fontSize={12}
                                  fontWeight={500}
                                >
                                  ${moneyFlowData.total_income?.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </text>
                              </>
                            )}
                          </Layer>
                        );
                      }}
                      link={{ stroke: '#77777777' }}
                      nodePadding={50}
                      nodeWidth={12}
                      margin={{ top: 50, right: 140, bottom: 30, left: 120 }}
                      iterations={64}
                    >
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        }
                        contentStyle={{
                          backgroundColor: 'var(--ant-color-bg-elevated, #fff)',
                          border: '1px solid var(--ant-color-border, #d9d9d9)',
                          borderRadius: 6,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary">
                  This diagram shows how money flows from income sources through your budget to expense categories.
                  {(moneyFlowData?.savings || 0) > 0 && ' Green on the right represents your savings!'}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Reports</Title>
        <Space size="middle">
          <Space>
            <Text>Date Range:</Text>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              presets={[
                { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                { label: 'This Quarter', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
                { label: 'This Year', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
                { label: 'Last 30 Days', value: [dayjs().subtract(30, 'days'), dayjs()] },
                { label: 'Last 90 Days', value: [dayjs().subtract(90, 'days'), dayjs()] },
              ]}
            />
          </Space>
          <Space>
            <Text>Account:</Text>
            <Select
              style={{ width: 180 }}
              placeholder="All Accounts"
              allowClear
              value={selectedAccountId}
              onChange={(value) => setSelectedAccountId(value)}
            >
              {accounts.map((acc: Account) => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name}
                </Option>
              ))}
            </Select>
          </Space>
        </Space>
      </div>

      {/* Report Tabs */}
      <Card>
        <Tabs defaultActiveKey="spending" items={tabItems} />
      </Card>
    </div>
  );
};

export default Reports;
