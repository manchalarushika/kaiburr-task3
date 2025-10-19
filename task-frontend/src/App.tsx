import { useState, useEffect, useCallback, type FC, useMemo } from 'react';
import {
    Layout, theme, Table, Button, Form, Input, Modal,
    Spin, message, notification, Space, Tag, Typography, InputNumber
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
    CloudUploadOutlined, HistoryOutlined, ThunderboltOutlined, CloseOutlined,
    IdcardOutlined
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import type { FilterConfirmProps } from 'antd/es/table/interface';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

// =======================================================
// 1. TYPE DEFINITIONS
// =======================================================

/** Defines the structure for a single task execution record. */
interface TaskExecution {
    id?: number;
    startTime: string;
    output: string;
}

/** Defines the structure for a core Task object retrieved from the API. */
interface Task {
    id: number;
    name: string;
    owner: string;
    command: string;
    taskExecutions?: TaskExecution[]; // Execution history is optional/lazy loaded
}

/** Defines the structure used for sending data to the API (Create/Update). */
//@ts-ignore
interface TaskFormData extends Omit<Task, 'taskExecutions'> {
    id?: number; // ID is optional for creation, but present for updates
}

// =======================================================
// 2. API CONFIGURATION & UTILITY
// =======================================================
// NOTE: This assumes your Spring Boot API is running on the same host/port,
// or that you have a proxy configured (e.g., in package.json or vite.config.ts).
const API_BASE_URL = '/api/tasks';

/**
 * Handles API requests with standardized error handling and exponential backoff.
 * @template T The expected return type of the data.
 */
const apiRequest = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
    try {
        let response: Response | null = null;
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            // Attempt the fetch request
            response = await fetch(url,options);
            if (response.ok) break; // Success, break retry loop

            // If not successful, wait and retry (exponential backoff)
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }

        if (!response) {
            throw new Error("Network request failed after multiple retries.");
        }

        // Try to parse JSON, but allow non-JSON responses (e.g., DELETE)
        let data: any = await response.json().catch(() => null);

        if (!response.ok) {
            const errorReason = data?.message || response.statusText;
            throw new Error(`API Error (${response.status}): ${errorReason}`);
        }
        // If no content (like in a DELETE), return undefined or an empty object
        return (data === null || data === undefined) ? {} as T : data as T;
    } catch (error: any) {
        console.error("API Request Failed:", error);
        throw error;
    }
};

// =======================================================
// 3. MAIN APPLICATION COMPONENT
// =======================================================

const App: FC = () => {
    // --- Ant Design Hooks & Theme ---
    const { token } = theme.useToken();
    const [form] = Form.useForm<TaskFormData>(); // Form instance created here

    // --- State Initialization ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isFormModalVisible, setIsFormModalVisible] = useState<boolean>(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [executeLoadingId, setExecuteLoadingId] = useState<number | null>(null);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState<boolean>(false);
    const [historyTask, setHistoryTask] = useState<Task | null>(null);


    // --- Data Fetching (Read/Search) ---
    const fetchTasks = useCallback(async (name: string = '') => {
        setLoading(true);
        try {
            // GET /api/tasks or GET /api/tasks/search?name=...
            const url = name ? `${API_BASE_URL}/search?name=${name}` : API_BASE_URL;
            const fetchedTasks = await apiRequest<Task[]>(url);
            // Ensure fetchedTasks is an array for safety
            setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
        } catch (err: any) {
            // Handle 404 gracefully by clearing the list
            if (err.message.includes("404")) {
                setTasks([]);
            } else {
                notification.error({
                    message: 'Fetch Error',
                    description: `Failed to load tasks: ${err.message}`,
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // --- Handlers (Create, Update, Delete, Execute) ---

    // Handler for Create or Update Task (PUT /tasks)
    const handleSaveTask = async (values: TaskFormData) => {
        message.loading({ content: editingTask ? 'Saving Task...' : 'Creating Task...', key: 'save' });
        try {
            const payload: TaskFormData = {
                ...values,
                id: values.id || editingTask?.id, // Use form value for ID, fallback to editingTask ID
            };

            await apiRequest<Task>(API_BASE_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            message.success({ content: `Task "${values.name}" saved successfully!`, key: 'save', duration: 2 });
            setIsFormModalVisible(false);
            setEditingTask(null);
            form.resetFields();
            await fetchTasks(); // Refresh list
        } catch (err: any) {
            message.error({ content: `Save failed: ${err.message}`, key: 'save' });
        }
    };

    // Handler for Delete Task (DELETE /tasks/{id})
    const handleDeleteTask = (id: number, name: string) => {
        Modal.confirm({
            title: `Are you sure you want to delete task: ${name}?`,
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            async onOk() {
                message.loading({ content: 'Deleting Task...', key: 'delete' });
                try {
                    // DELETE /api/tasks/{id}
                    await apiRequest<void>(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
                    message.success({ content: `Task "${name}" deleted successfully!`, key: 'delete', duration: 2 });
                    await fetchTasks();
                } catch (err: any) {
                    message.error({ content: `Deletion failed: ${err.message}`, key: 'delete' });
                }
            },
        });
    };

    // Handler for Execute Task (PUT /tasks/execute/{id})
    const handleExecuteTask = async (id: number, name: string) => {
        setExecuteLoadingId(id);
        const key = `execute-${id}`;
        message.loading({ content: `Executing task "${name}"...`, key });
        try {
            // PUT /api/tasks/execute/{id}
            const updatedTask = await apiRequest<Task>(`${API_BASE_URL}/execute/${id}`, { method: 'PUT' });

            message.success({ content: `Task "${name}" executed successfully!`, key, duration: 3 });

            // Show history modal immediately after execution
            setHistoryTask(updatedTask);
            setIsHistoryModalVisible(true);

            await fetchTasks(); // Refresh the task list in the background
        } catch (err: any) {
            message.error({ content: `Execution failed for "${name}": ${err.message}`, key });
            await fetchTasks(); // Refresh to get potential failed execution record
        } finally {
            setExecuteLoadingId(null);
        }
    };

    // --- Modal Controls ---
    const openFormModal = (task: Task | null) => {
        setEditingTask(task);
        if (task) {
            form.setFieldsValue(task);
        } else {
            form.resetFields();
        }
        setIsFormModalVisible(true);
    };

    const closeFormModal = () => {
        setIsFormModalVisible(false);
        setEditingTask(null);
        form.resetFields();
    };

    const openHistoryModal = (task: Task) => {
        // Fetch full task details including execution history if not already present
        // In a real app, you might only fetch history here. For simplicity, we use what we have.
        setHistoryTask(task);
        setIsHistoryModalVisible(true);
    };

    // --- Ant Design Table Configuration ---

    // Custom search filter for the Name and Owner columns
    const getColumnSearchProps = (dataIndex: keyof Task) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: {
            setSelectedKeys: (selectedKeys: string[]) => void,
            selectedKeys: string[],
            confirm: (param?: FilterConfirmProps) => void,
            clearFilters: () => void,
        }) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => {
                            // If the filter is applied, we'll locally filter the results
                            confirm();
                            // If you wanted to do a backend search on a filter change, you would call:
                            // fetchTasks(selectedKeys[0]);
                        }}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Search
                    </Button>
                    <Button
                        onClick={() => { clearFilters && clearFilters(); confirm() }}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? token.colorPrimary : undefined }} />
        ),
        // Local client-side filtering logic
        onFilter: (value: string | number | boolean, record: Task) =>
            record[dataIndex as keyof Task]?.toString().toLowerCase().includes(value.toString().toLowerCase()),
    });

    //@ts-ignore
    const columns: TableProps<Task>['columns'] = useMemo(() => [
        // --- Task ID Column ---
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            // Sort numerically instead of by string comparison
            sorter: (a, b) => a.id - b.id,
            // Use search props to allow filtering by ID number (converted to string for search)
            ...getColumnSearchProps('id'),
            width: '10%', // Reduced width for ID
            align: 'center',
            render: (text) => <Text code>{text}</Text> // Using <Text code> for a monospaced/ID look
        },
        // --- Task Name Column ---
        {
            title: 'Task Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            ...getColumnSearchProps('name'),
            width: '20%',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Command',
            dataIndex: 'command',
            key: 'command',
            width: '35%',
            render: (text: string) => <Tag color="default" style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px', display: 'inline-block' }}>{text}</Tag>
        },
        {
            title: 'Owner',
            dataIndex: 'owner',
            key: 'owner',
            width: '10%',
            ...getColumnSearchProps('owner'),
        },
        {
            title: 'Executions',
            dataIndex: 'taskExecutions',
            key: 'executions',
            width: '10%',
            align: 'center',
            render: (executions: TaskExecution[] | undefined) => (
                <Text type="secondary">{executions?.length || 0}</Text>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: '15%',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        loading={executeLoadingId === record.id}
                        onClick={() => handleExecuteTask(record.id, record.name)}
                        size="small"
                    >
                        Run
                    </Button>
                    <Button
                        icon={<HistoryOutlined />}
                        onClick={() => openHistoryModal(record)}
                        title="View History"
                        size="small"
                    />
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openFormModal(record)}
                        title="Edit Task"
                        size="small"
                    />
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteTask(record.id, record.name)}
                        title="Delete Task"
                        size="small"
                    />
                </Space>
            ),
        },
    ], [executeLoadingId, token]);

    // --- History Modal Content ---
    const ExecutionHistoryContent = (
        <Spin spinning={!historyTask}>
            {historyTask?.taskExecutions && historyTask.taskExecutions.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Reverse for newest first */}
                    {historyTask.taskExecutions.slice().reverse().map((exec, index) => {
                        const isError = exec.output.includes("[ERROR]");
                        return (
                            <div key={index} style={{
                                padding: token.padding,
                                borderRadius: token.borderRadius,
                                border: `1px solid ${isError ? token.colorErrorBorder : token.colorBorderSecondary}`,
                                backgroundColor: isError ? token.colorErrorBg : token.colorFillAlter
                            }}>
                                <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                                    Ran at: {new Date(exec.startTime).toLocaleString()}
                                </Text>
                                <pre style={{
                                    backgroundColor: token.colorBgContainer,
                                    padding: token.paddingSM,
                                    borderRadius: token.borderRadiusSM,
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '12px',
                                    color: isError ? token.colorError : token.colorSuccess,
                                }}>
                                    {exec.output}
                                </pre>
                            </div>
                        );
                    })}
                </Space>
            ) : (
                <Text type="secondary">No execution history found for this task.</Text>
            )}
        </Spin>
    );

    // --- Component Render ---
    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
            <Header style={{ backgroundColor: token.colorBgContainer, padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
                    Kaiburr Task Scheduler
                </Title>
            </Header>

            <Content style={{ padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
                <div style={{ marginBottom: token.marginLG, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={3} style={{ margin: 0 }}>Task Management</Title>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={() => openFormModal(null)}
                    >
                        Create New Task
                    </Button>
                </div>

                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={tasks}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }}
                        style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}
                    />
                </Spin>
            </Content>

            {/* --- Task Form Modal (Create/Edit) --- */}
            <Modal
                title={editingTask ? `Edit Task: ${editingTask.name}` : 'Create New Task'}
                open={isFormModalVisible}
                onCancel={closeFormModal}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={form} // <<< FIX APPLIED HERE: Connecting the form instance to the component
                    layout="vertical"
                    name="task_form"
                    onFinish={handleSaveTask}
                    initialValues={editingTask || { owner: '' }}
                    style={{ marginTop: token.margin }}
                >
                    {/* --- Task ID Field --- */}
                    <Form.Item
                        name="id"
                        label="Task ID"
                        // Since ID is the primary key for PUT/Update logic, it is required.
                        rules={[{ required: true, message: 'Please input a unique Task ID!' }]}
                        tooltip="Use an existing ID to update, or a new ID to create a task."
                    >
                        {/* Using InputNumber for ID field with min=1 */}
                        <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                            prefix={<IdcardOutlined />}
                            placeholder="Enter Task ID (e.g., 101)"
                        />
                    </Form.Item>

                    {/* --- Task Name Field --- */}
                    <Form.Item
                        name="name"
                        label="Task Name"
                        rules={[{ required: true, message: 'Please input the task name!' }]}
                    >
                        <Input prefix={<CloudUploadOutlined />} placeholder="e.g., Daily Database Backup" />
                    </Form.Item>

                    <Form.Item
                        name="command"
                        label="Shell Command"
                        rules={[{ required: true, message: 'Please input the shell command!' }]}
                        tooltip="The actual command to be executed (e.g., 'kubectl apply -f config.yaml')"
                    >
                        <TextArea rows={4} placeholder="Enter command here..." style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                    <Form.Item
                        name="owner"
                        label="Owner (Optional)"
                    >
                        <Input placeholder="Team or user responsible" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block>
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* --- Execution History Modal --- */}
            <Modal
                title={`Execution History: ${historyTask?.name || 'Loading...'}`}
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>
                        <CloseOutlined /> Close
                    </Button>
                ]}
                width={800}
                centered
            >
                {ExecutionHistoryContent}
            </Modal>
        </Layout>
    );
};

export default App;
