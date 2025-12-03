import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Space,
  Tag,
  Card,
  Row,
  Col,
  message,
  Popconfirm,
  Tooltip,
  Segmented,
  Divider,
  Upload,
  Steps,
  Alert,
  Statistic,
  Checkbox,
  Result,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  SearchOutlined,
  FilterOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { Transaction, TransactionType, Account, Category } from '../../shared/types';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const transactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Income',
  [TransactionType.EXPENSE]: 'Expense',
  [TransactionType.TRANSFER]: 'Transfer',
};

const transactionTypeColors: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'green',
  [TransactionType.EXPENSE]: 'red',
  [TransactionType.TRANSFER]: 'blue',
};

const transactionTypeIcons: Record<TransactionType, React.ReactNode> = {
  [TransactionType.INCOME]: <ArrowUpOutlined />,
  [TransactionType.EXPENSE]: <ArrowDownOutlined />,
  [TransactionType.TRANSFER]: <SwapOutlined />,
};

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [filters, setFilters] = useState<{
    account_id?: number;
    category_id?: number;
    transaction_type?: TransactionType;
    start_date?: string;
    end_date?: string;
    search?: string;
  }>({});
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Pagination state
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAccountId, setImportAccountId] = useState<number | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    defaultCategoryId: undefined as number | undefined,
    dateFormat: '%m/%d/%Y',
    autoCategorize: true,
    flipTypes: undefined as boolean | undefined,
  });
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Create keyword rule modal state
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [keywordFromTransaction, setKeywordFromTransaction] = useState<{
    payee: string;
    categoryId?: number;
    transactionType: TransactionType;
  } | null>(null);
  const [keywordForm] = Form.useForm();

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.getTransactions(filters),
  });

  // Fetch accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Transaction created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create transaction');
    },
  });

  // Update transaction mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Transaction updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update transaction');
    },
  });

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Transaction deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete transaction');
    },
  });

  // Create keyword rule mutation
  const createKeywordMutation = useMutation({
    mutationFn: (data: { keyword: string; category_id: number; priority?: number; match_mode?: 'contains' | 'starts_with' | 'exact' }) =>
      apiClient.createKeyword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['keywordsCount'] });
      message.success('Keyword rule created! Future transactions with this payee will be auto-categorized.');
      setIsKeywordModalOpen(false);
      setKeywordFromTransaction(null);
      keywordForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create keyword rule');
    },
  });

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionType(transaction.transaction_type);
      form.setFieldsValue({
        ...transaction,
        transaction_date: dayjs(transaction.transaction_date),
      });
    } else {
      setEditingTransaction(null);
      setTransactionType(TransactionType.EXPENSE);
      form.resetFields();
      form.setFieldsValue({
        transaction_date: dayjs(),
        transaction_type: TransactionType.EXPENSE,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      transaction_type: transactionType,
      transaction_date: values.transaction_date.format('YYYY-MM-DD'),
    };

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Open keyword rule modal from transaction
  const handleOpenKeywordModal = (payee: string, categoryId?: number, txType: TransactionType = TransactionType.EXPENSE) => {
    setKeywordFromTransaction({
      payee: payee.toLowerCase().trim(),
      categoryId,
      transactionType: txType,
    });
    keywordForm.setFieldsValue({
      keyword: payee.toLowerCase().trim(),
      category_id: categoryId,
      match_mode: 'contains',
    });
    setIsKeywordModalOpen(true);
  };

  const handleCreateKeywordRule = (values: any) => {
    createKeywordMutation.mutate({
      keyword: values.keyword,
      category_id: values.category_id,
      match_mode: values.match_mode || 'contains',
    });
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setFilters({
        ...filters,
        start_date: dates[0]?.format('YYYY-MM-DD'),
        end_date: dates[1]?.format('YYYY-MM-DD'),
      });
    } else {
      const { start_date, end_date, ...rest } = filters;
      setFilters(rest);
    }
  };

  // Get account name by ID
  const getAccountName = (accountId?: number) => {
    if (!accountId) return '-';
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account?.name || 'Unknown';
  };

  // Get category name by ID
  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    // Flatten categories to find by ID
    const findCategory = (cats: Category[]): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat;
        if (cat.subcategories) {
          const found = findCategory(cat.subcategories);
          if (found) return found;
        }
      }
      return undefined;
    };
    const category = findCategory(categories);
    return category?.name || 'Unknown';
  };

  // Build flat category list for select
  const flattenCategories = (cats: Category[], parentName?: string): { id: number; name: string; fullName: string }[] => {
    const result: { id: number; name: string; fullName: string }[] = [];
    for (const cat of cats) {
      const fullName = parentName ? `${parentName} → ${cat.name}` : cat.name;
      result.push({ id: cat.id, name: cat.name, fullName });
      if (cat.subcategories) {
        result.push(...flattenCategories(cat.subcategories, cat.name));
      }
    }
    return result;
  };

  // Flatten categories for search
  flattenCategories(categories);

  // Import handlers
  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
    setImportStep(0);
    setImportFile(null);
    setImportAccountId(null);
    setImportPreview(null);
    setImportResult(null);
    setImportOptions({
      skipDuplicates: true,
      defaultCategoryId: undefined,
      dateFormat: '%m/%d/%Y',
      autoCategorize: true,
      flipTypes: undefined,
    });
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    if (importResult) {
      // Refresh transactions after successful import
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  };

  const handleImportFileSelect = (file: File) => {
    setImportFile(file);
    return false; // Prevent auto upload
  };

  const handlePreviewImport = async () => {
    if (!importFile || !importAccountId) {
      message.error('Please select a file and account');
      return;
    }

    setImportLoading(true);
    try {
      const preview = await apiClient.previewImport(
        importFile,
        importAccountId,
        importOptions.dateFormat,
        importOptions.flipTypes
      );
      setImportPreview(preview);
      setImportStep(1);
    } catch (error: any) {
      message.error(error.message || 'Failed to preview import');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile || !importAccountId) return;

    setImportLoading(true);
    try {
      const result = await apiClient.executeImport(importFile, importAccountId, {
        skipDuplicates: importOptions.skipDuplicates,
        defaultCategoryId: importOptions.defaultCategoryId,
        dateFormat: importOptions.dateFormat,
        autoCategorize: importOptions.autoCategorize,
        flipTypes: importOptions.flipTypes,
      });
      setImportResult(result);
      setImportStep(2);
      message.success(`Successfully imported ${result.imported_count} transactions`);
    } catch (error: any) {
      message.error(error.message || 'Failed to import transactions');
    } finally {
      setImportLoading(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      width: 120,
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: Transaction, b: Transaction) =>
        dayjs(a.transaction_date).unix() - dayjs(b.transaction_date).unix(),
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 100,
      render: (type: TransactionType) => (
        <Tag color={transactionTypeColors[type]} icon={transactionTypeIcons[type]}>
          {transactionTypeLabels[type]}
        </Tag>
      ),
    },
    {
      title: 'Payee / Description',
      key: 'description',
      render: (_: any, record: Transaction) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.payee || '-'}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Account',
      key: 'account',
      render: (_: any, record: Transaction) => {
        if (record.transaction_type === TransactionType.TRANSFER) {
          return (
            <Space>
              {getAccountName(record.from_account_id)}
              <SwapOutlined />
              {getAccountName(record.to_account_id)}
            </Space>
          );
        }
        return getAccountName(record.account_id);
      },
    },
    {
      title: 'Category',
      dataIndex: 'category_id',
      key: 'category_id',
      render: (categoryId: number | undefined, record: Transaction) => {
        if (record.transaction_type === TransactionType.TRANSFER) {
          return <Tag>Transfer</Tag>;
        }
        return getCategoryName(categoryId);
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number, record: Transaction) => {
        const color =
          record.transaction_type === TransactionType.INCOME
            ? '#52c41a'
            : record.transaction_type === TransactionType.EXPENSE
            ? '#ff4d4f'
            : '#1890ff';
        const prefix =
          record.transaction_type === TransactionType.INCOME
            ? '+'
            : record.transaction_type === TransactionType.EXPENSE
            ? '-'
            : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, record: Transaction) => (
        <Space>
          {/* Create Rule - only for income/expense with payee */}
          {record.payee && record.transaction_type !== TransactionType.TRANSFER && (
            <Tooltip title="Create auto-categorization rule">
              <Button
                type="text"
                icon={<ThunderboltOutlined />}
                onClick={() => handleOpenKeywordModal(record.payee!, record.category_id, record.transaction_type)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Transaction"
            description="Are you sure you want to delete this transaction?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Transactions</Title>
        <Space>
          <Button icon={<UploadOutlined />} onClick={handleOpenImportModal}>
            Import from Bank
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Transaction
          </Button>
        </Space>
      </div>

      {/* Transactions Card with Filters */}
      <Card>
        {/* Filters Row */}
        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space wrap size="small">
              <Input
                placeholder="Search payee or description"
                prefix={<SearchOutlined />}
                allowClear
                style={{ width: 220 }}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              />
              <RangePicker
                onChange={handleDateRangeChange}
                placeholder={['Start Date', 'End Date']}
              />
              <Select
                style={{ width: 140 }}
                placeholder="Account"
                allowClear
                onChange={(value) => setFilters({ ...filters, account_id: value })}
              >
                {accounts.map((acc: Account) => (
                  <Option key={acc.id} value={acc.id}>
                    {acc.name}
                  </Option>
                ))}
              </Select>
              <Select
                style={{ width: 120 }}
                placeholder="Type"
                allowClear
                onChange={(value) => setFilters({ ...filters, transaction_type: value })}
              >
                {Object.entries(transactionTypeLabels).map(([value, label]) => (
                  <Option key={value} value={value}>
                    {label}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilters({})}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Transaction Type Selector */}
          {!editingTransaction && (
            <Form.Item label="Transaction Type">
              <Segmented
                block
                value={transactionType}
                onChange={(value) => setTransactionType(value as TransactionType)}
                options={[
                  {
                    label: (
                      <Space>
                        <ArrowDownOutlined /> Expense
                      </Space>
                    ),
                    value: TransactionType.EXPENSE,
                  },
                  {
                    label: (
                      <Space>
                        <ArrowUpOutlined /> Income
                      </Space>
                    ),
                    value: TransactionType.INCOME,
                  },
                  {
                    label: (
                      <Space>
                        <SwapOutlined /> Transfer
                      </Space>
                    ),
                    value: TransactionType.TRANSFER,
                  },
                ]}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transaction_date"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Conditional Fields based on Transaction Type */}
          {transactionType === TransactionType.TRANSFER ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="from_account_id"
                  label="From Account"
                  rules={[{ required: true, message: 'Please select source account' }]}
                >
                  <Select placeholder="Select source account">
                    {accounts
                      .filter((acc: Account) => acc.is_active)
                      .map((acc: Account) => (
                        <Option key={acc.id} value={acc.id}>
                          {acc.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="to_account_id"
                  label="To Account"
                  rules={[{ required: true, message: 'Please select destination account' }]}
                >
                  <Select placeholder="Select destination account">
                    {accounts
                      .filter((acc: Account) => acc.is_active)
                      .map((acc: Account) => (
                        <Option key={acc.id} value={acc.id}>
                          {acc.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="account_id"
                  label="Account"
                  rules={[{ required: true, message: 'Please select account' }]}
                >
                  <Select placeholder="Select account">
                    {accounts
                      .filter((acc: Account) => acc.is_active)
                      .map((acc: Account) => (
                        <Option key={acc.id} value={acc.id}>
                          {acc.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="category_id"
                  label="Category"
                  rules={[{ required: true, message: 'Please select category' }]}
                >
                  <Select placeholder="Select category" showSearch optionFilterProp="label">
                    {(transactionType === TransactionType.INCOME
                      ? categories.filter((c: Category) => c.category_type === 'income')
                      : categories.filter((c: Category) => c.category_type === 'expense')
                    ).map((cat: Category) => (
                      <Select.OptGroup key={cat.id} label={cat.name}>
                        {cat.subcategories?.map((sub: Category) => (
                          <Option key={sub.id} value={sub.id} label={`${cat.name} - ${sub.name}`}>
                            {sub.name}
                          </Option>
                        ))}
                      </Select.OptGroup>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="payee" label="Payee">
            <Input placeholder="e.g., Grocery Store, Electric Company" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional notes about this transaction" />
          </Form.Item>

          {/* Create Rule Option - show when editing and has payee */}
          {editingTransaction && editingTransaction.payee && transactionType !== TransactionType.TRANSFER && (
            <Alert
              message="Auto-categorize similar transactions"
              description={
                <Space direction="vertical" size={4}>
                  <span>Create a rule to automatically categorize future transactions from "{editingTransaction.payee}"</span>
                  <Button 
                    type="link" 
                    icon={<ThunderboltOutlined />} 
                    style={{ padding: 0 }}
                    onClick={() => {
                      const categoryId = form.getFieldValue('category_id');
                      handleOpenKeywordModal(editingTransaction.payee!, categoryId, transactionType);
                    }}
                  >
                    Create Auto-Categorization Rule
                  </Button>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTransaction ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Transactions from Bank"
        open={isImportModalOpen}
        onCancel={handleCloseImportModal}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Steps
          current={importStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Select File', icon: <FileTextOutlined /> },
            { title: 'Preview', icon: <SearchOutlined /> },
            { title: 'Complete', icon: <CheckCircleOutlined /> },
          ]}
        />

        {/* Step 0: Select File */}
        {importStep === 0 && (
          <div>
            <Alert
              message="Supported File Formats"
              description="Upload a CSV, OFX, or QFX file exported from your bank. Most banks offer these download options in their transaction history."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form layout="vertical">
              <Form.Item label="Select Account" required>
                <Select
                  placeholder="Choose which account to import into"
                  value={importAccountId}
                  onChange={(value) => setImportAccountId(value)}
                  style={{ width: '100%' }}
                >
                  {accounts
                    .filter((acc: Account) => acc.is_active)
                    .map((acc: Account) => (
                      <Option key={acc.id} value={acc.id}>
                        {acc.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item label="Upload Bank File" required>
                <Upload.Dragger
                  accept=".csv,.ofx,.qfx"
                  maxCount={1}
                  beforeUpload={handleImportFileSelect}
                  onRemove={() => setImportFile(null)}
                  fileList={importFile ? [{ uid: '-1', name: importFile.name, status: 'done' } as UploadFile] : []}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area</p>
                  <p className="ant-upload-hint">
                    Supports CSV, OFX, and QFX files from your bank
                  </p>
                </Upload.Dragger>
              </Form.Item>

              <Form.Item label="Date Format (for CSV files)">
                <Select
                  value={importOptions.dateFormat}
                  onChange={(value) => setImportOptions({ ...importOptions, dateFormat: value })}
                >
                  <Option value="%m/%d/%Y">MM/DD/YYYY (US)</Option>
                  <Option value="%d/%m/%Y">DD/MM/YYYY (UK/EU)</Option>
                  <Option value="%Y-%m-%d">YYYY-MM-DD (ISO)</Option>
                  <Option value="%m-%d-%Y">MM-DD-YYYY</Option>
                </Select>
              </Form.Item>

              <Form.Item 
                label="Transaction Type Handling"
                extra="Different banks use different conventions. If expenses appear as income (or vice versa), try flipping the types."
              >
                <Select
                  value={importOptions.flipTypes === undefined ? 'auto' : importOptions.flipTypes ? 'flip' : 'normal'}
                  onChange={(value) => setImportOptions({ 
                    ...importOptions, 
                    flipTypes: value === 'auto' ? undefined : value === 'flip' 
                  })}
                >
                  <Option value="auto">Auto-detect (flip for credit cards)</Option>
                  <Option value="normal">Normal (positive = income, negative = expense)</Option>
                  <Option value="flip">Flipped (positive = expense, negative = income)</Option>
                </Select>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={handleCloseImportModal}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={handlePreviewImport}
                  loading={importLoading}
                  disabled={!importFile || !importAccountId}
                >
                  Preview Import
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {importStep === 1 && importPreview && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="Total Transactions"
                  value={importPreview.total_count}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Income"
                  value={importPreview.income_count}
                  prefix={<ArrowUpOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`($${importPreview.total_income.toFixed(2)})`}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Expenses"
                  value={importPreview.expense_count}
                  prefix={<ArrowDownOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                  suffix={`($${importPreview.total_expenses.toFixed(2)})`}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Auto-Categorized"
                  value={importPreview.categorized_count || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`of ${importPreview.total_count}`}
                />
              </Col>
            </Row>

            {importPreview.categorized_count > 0 && (
              <Alert
                message={`${importPreview.categorized_count} transaction(s) auto-categorized`}
                description="Based on merchant names and descriptions, categories have been automatically suggested for some transactions."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {importPreview.duplicates_count > 0 && (
              <Alert
                message={`${importPreview.duplicates_count} potential duplicate(s) detected`}
                description="Transactions with matching date, amount, and type already exist in this account."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Card title="Import Options" size="small" style={{ marginBottom: 16 }}>
              <Form layout="vertical">
                <Form.Item 
                  label="Transaction Type Handling"
                  extra="If income/expenses look reversed, change this setting and click 'Re-preview'"
                  style={{ marginBottom: 12 }}
                >
                  <Space>
                    <Select
                      value={importOptions.flipTypes === undefined ? 'auto' : importOptions.flipTypes ? 'flip' : 'normal'}
                      onChange={(value) => setImportOptions({ 
                        ...importOptions, 
                        flipTypes: value === 'auto' ? undefined : value === 'flip' 
                      })}
                      style={{ width: 320 }}
                    >
                      <Option value="auto">Auto-detect (flip for credit cards)</Option>
                      <Option value="normal">Normal (positive = income, negative = expense)</Option>
                      <Option value="flip">Flipped (positive = expense, negative = income)</Option>
                    </Select>
                    <Button 
                      onClick={handlePreviewImport}
                      loading={importLoading}
                    >
                      Re-preview
                    </Button>
                  </Space>
                </Form.Item>
                <Form.Item style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={importOptions.autoCategorize}
                    onChange={(e) => setImportOptions({ ...importOptions, autoCategorize: e.target.checked })}
                  >
                    Auto-categorize transactions based on merchant/description
                  </Checkbox>
                </Form.Item>
                <Form.Item style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={importOptions.skipDuplicates}
                    onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                  >
                    Skip duplicate transactions
                  </Checkbox>
                </Form.Item>
                <Form.Item label="Fallback Category (for uncategorized transactions)">
                  <Select
                    placeholder="Leave uncategorized or select fallback"
                    allowClear
                    value={importOptions.defaultCategoryId}
                    onChange={(value) => setImportOptions({ ...importOptions, defaultCategoryId: value })}
                    style={{ width: '100%' }}
                  >
                    {categories
                      .filter((c: Category) => c.category_type === 'expense')
                      .map((cat: Category) => (
                        <Select.OptGroup key={cat.id} label={cat.name}>
                          {cat.subcategories?.map((sub: Category) => (
                            <Option key={sub.id} value={sub.id}>
                              {sub.name}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      ))}
                  </Select>
                </Form.Item>
              </Form>
            </Card>

            <Card title="Transaction Preview" size="small">
              <Table
                dataSource={importPreview.transactions.slice(0, 10)}
                rowKey={(_, index) => index!.toString()}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'transaction_date',
                    key: 'date',
                    width: 100,
                    render: (date: string) => dayjs(date).format('MMM D, YYYY'),
                  },
                  {
                    title: 'Type',
                    dataIndex: 'transaction_type',
                    key: 'type',
                    width: 80,
                    render: (type: TransactionType) => (
                      <Tag color={transactionTypeColors[type]}>
                        {type === TransactionType.INCOME ? 'Income' : 'Expense'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Description',
                    dataIndex: 'payee',
                    key: 'payee',
                    ellipsis: true,
                  },
                  {
                    title: 'Category',
                    dataIndex: 'suggested_category_name',
                    key: 'category',
                    width: 180,
                    render: (category: string | null) => (
                      category ? (
                        <Tag color="green" icon={<CheckCircleOutlined />}>{category}</Tag>
                      ) : (
                        <Tag color="default">Uncategorized</Tag>
                      )
                    ),
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    key: 'amount',
                    width: 100,
                    align: 'right' as const,
                    render: (amount: number, record: any) => (
                      <span style={{ color: record.transaction_type === TransactionType.INCOME ? '#52c41a' : '#ff4d4f' }}>
                        ${amount.toFixed(2)}
                      </span>
                    ),
                  },
                ]}
              />
              {importPreview.transactions.length > 10 && (
                <div style={{ textAlign: 'center', padding: 8, color: '#8c8c8c' }}>
                  ... and {importPreview.transactions.length - 10} more transactions
                </div>
              )}
            </Card>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={() => setImportStep(0)}>Back</Button>
                <Button
                  type="primary"
                  onClick={handleExecuteImport}
                  loading={importLoading}
                >
                  Import {importPreview.total_count - (importOptions.skipDuplicates ? importPreview.duplicates_count : 0)} Transactions
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Step 2: Complete */}
        {importStep === 2 && importResult && (
          <Result
            status="success"
            title="Import Complete!"
            subTitle={
              <div>
                <p>Successfully imported <strong>{importResult.imported_count}</strong> transactions.</p>
                {importResult.skipped_count > 0 && (
                  <p>Skipped {importResult.skipped_count} duplicate transactions.</p>
                )}
                {importResult.auto_categorized_count > 0 && (
                  <p><CheckCircleOutlined style={{ color: '#52c41a' }} /> Auto-categorized {importResult.auto_categorized_count} transactions.</p>
                )}
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Statistic
                      title="Total Income"
                      value={importResult.total_income}
                      precision={2}
                      prefix="$"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Total Expenses"
                      value={importResult.total_expenses}
                      precision={2}
                      prefix="$"
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                </Row>
              </div>
            }
            extra={[
              <Button key="close" type="primary" onClick={handleCloseImportModal}>
                Done
              </Button>,
              <Button key="another" onClick={() => {
                setImportStep(0);
                setImportFile(null);
                setImportPreview(null);
                setImportResult(null);
              }}>
                Import Another File
              </Button>,
            ]}
          />
        )}
      </Modal>

      {/* Create Keyword Rule Modal */}
      <Modal
        title="Create Auto-Categorization Rule"
        open={isKeywordModalOpen}
        onCancel={() => {
          setIsKeywordModalOpen(false);
          setKeywordFromTransaction(null);
          keywordForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Alert
          message="How it works"
          description="When importing transactions, if the payee or description contains this keyword, the transaction will be automatically assigned to the selected category."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={keywordForm} layout="vertical" onFinish={handleCreateKeywordRule}>
          <Form.Item
            name="keyword"
            label="Keyword to match"
            rules={[{ required: true, message: 'Please enter a keyword' }]}
            extra="This text will be matched against transaction payee/description"
          >
            <Input placeholder="e.g., starbucks" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Assign to Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category" showSearch optionFilterProp="label">
              {(keywordFromTransaction?.transactionType === TransactionType.INCOME
                ? categories.filter((c: Category) => c.category_type === 'income')
                : categories.filter((c: Category) => c.category_type === 'expense')
              ).map((cat: Category) => (
                <Select.OptGroup key={cat.id} label={cat.name}>
                  {cat.subcategories?.map((sub: Category) => (
                    <Option key={sub.id} value={sub.id} label={`${cat.name} - ${sub.name}`}>
                      {sub.name}
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="match_mode"
            label="Match Mode"
            initialValue="contains"
          >
            <Select>
              <Option value="contains">Contains (default)</Option>
              <Option value="starts_with">Starts With</Option>
              <Option value="exact">Exact Match</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsKeywordModalOpen(false);
                setKeywordFromTransaction(null);
                keywordForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ThunderboltOutlined />}
                loading={createKeywordMutation.isPending}
              >
                Create Rule
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Transactions;
