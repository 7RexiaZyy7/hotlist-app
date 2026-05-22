import { CozeAPI, COZE_CN_BASE_URL } from '@coze/api';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const TOKEN = process.env.COZE_PAT_TOKEN;
const BOT_ID = process.env.COZE_BOT_ID || '7639197902187020297';

if (!TOKEN) {
  console.error('请设置 COZE_PAT_TOKEN 环境变量');
  process.exit(1);
}

const client = new CozeAPI({
  baseURL: COZE_CN_BASE_URL,
  token: TOKEN,
  debug: false,
});

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // 1. List workspaces to find the space ID
  console.log('\n=== 1. 获取工作空间列表 ===');
  const workspaces = await client.workspaces.list({ page_num: 1, page_size: 20 });
  console.log('Available workspaces:', JSON.stringify(workspaces, null, 2));
  
  const spaceId = workspaces.workspaces?.[0]?.id;
  if (!spaceId) {
    console.error('未找到工作空间');
    process.exit(1);
  }
  console.log(`使用工作空间: ${spaceId}`);

  // 2. Create a dataset (knowledge base)
  console.log('\n=== 2. 创建知识库 ===');
  
  // First upload the XLSX file as the dataset cover/file
  const knowledgeDir = resolve(PROJECT_ROOT, 'coze-knowledge');
  const files = [
    { name: '爆款文案框架完全指南.md', path: resolve(knowledgeDir, '爆款文案框架完全指南.md') },
    { name: '中文社交媒体爆款文案模板.md', path: resolve(knowledgeDir, '中文社交媒体爆款文案模板.md') },
    { name: 'AI提问技巧.xlsx', path: resolve(knowledgeDir, 'AI提问技巧.xlsx') },
  ];

  // Upload all files first
  console.log('\n=== 3. 上传文件到 Coze ===');
  const uploadedFiles = [];
  for (const file of files) {
    console.log(`上传: ${file.name}`);
    const stream = createReadStream(file.path);
    const result = await client.files.upload({ file: stream });
    console.log(`  -> file_id: ${result.id}`);
    uploadedFiles.push({ ...file, fileId: result.id });
  }

  // Separate into doc files and sheet files
  const docFiles = uploadedFiles.filter(f => f.name.endsWith('.md'));
  const sheetFiles = uploadedFiles.filter(f => f.name.endsWith('.xlsx'));

  const datasetIds = [];

  // 4a. Create document-type dataset for markdown files
  if (docFiles.length > 0) {
    console.log('\n=== 4a. 创建文档类型知识库 ===');
    const docDataset = await client.datasets.create({
      name: 'hotlist-copywriting',
      space_id: spaceId,
      format_type: 0,
      description: '爆款文案框架与模板，包含AIDA/PAS/FAB等框架指南和各平台文案模板',
      file_id: docFiles[0].fileId,
    });
    const docDatasetId = docDataset.dataset_id;
    datasetIds.push(docDatasetId);
    console.log(`文档知识库 ID: ${docDatasetId}`);

    // Upload doc files
    console.log('\n=== 5a. 上传文档到知识库 ===');
    for (const file of docFiles) {
      console.log(`创建文档: ${file.name}`);
      const docResult = await client.datasets.documents.create({
        dataset_id: docDatasetId,
        document_bases: [{ name: file.name, source_info: { source_file_id: file.fileId, document_source: 5 } }],
        chunk_strategy: { chunk_type: 0 },
        format_type: 0,
      });
      console.log(`  -> document_id: ${docResult[0]?.document_id}`);
    }
  }

  // 4b. Note about xlsx
  if (sheetFiles.length > 0) {
    console.log('\n=== 4b. 表格文件说明 ===');
    console.log('AI提问技巧.xlsx 暂不支持通过 API 上传为表格知识库。');
    console.log('请在 Coze Web 界面手动上传:');
    console.log(`1. 打开 https://www.coze.cn/space/${spaceId}/bot/${BOT_ID}`);
    console.log('2. 在"知识"部分点击添加 → 新建知识库 → 选择"表格类型"');
    console.log(`3. 上传 coze-knowledge/AI提问技巧.xlsx`);
  }

  console.log('\n=== 6. 等待文档处理完成 ===');
  for (const dsId of datasetIds) {
    for (let i = 0; i < 30; i++) {
      try {
        const process = await client.datasets.process(dsId, { document_ids: [] });
        const allDone = process.data?.every?.(d => d.status === 1);
        if (allDone) {
          console.log(`数据集 ${dsId} 所有文档处理完成`);
          break;
        }
        console.log(`数据集 ${dsId} 处理中... (${i + 1}/30)`);
      } catch {
        // process may not be available yet
      }
      await sleep(2000);
    }
  }

  console.log('\n=== 完成! ===');
  console.log(`数据集已创建: ${datasetIds.join(', ')}`);
  console.log(`\n接下来需要在 Coze Bot (${BOT_ID}) 中添加知识库:`);
  console.log(`1. 打开 https://www.coze.cn/space/${spaceId}/bot/${BOT_ID}`);
  console.log(`2. 在 "知识" 部分点击添加，选择 "hotlist-copywriting"`);
  console.log(`3. 如果是表格数据，也添加 "hotlist-copywriting-xlsx"`);
  console.log(`4. 更新人设与回复逻辑，在 Prompt 中加入知识库使用说明`);
  console.log('5. 重新发布 Bot');
}

main().catch(err => {
  console.error('脚本失败:', err);
  process.exit(1);
});
