export interface AssetItem {
  id: string;
  title: string;
  content: string;
  desc?: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  items: AssetItem[];
}

export const hookCategories: AssetCategory[] = [
  {
    id: 'number-result',
    name: '数字 + 结果型',
    items: [
      { id: 'nr1', title: '时间+结果对比', content: '坚持早起 30 天，我的皮肤发生了肉眼可见的变化', desc: '用具体数字制造确定感' },
      { id: 'nr2', title: '动作+成果', content: '5 个动作练了 2 周，小腹真的平了', desc: '低门槛动作 + 明确时间' },
      { id: 'nr3', title: '方法+收益', content: '靠这 3 步复盘法，我半年存了 4 万块', desc: '方法论 + 具体收益金额' },
      { id: 'nr4', title: '时间+技能', content: '3 分钟掌握这个排版技巧，你的笔记立刻高级 10 倍', desc: '极短时间 + 夸张效果' },
      { id: 'nr5', title: '数量+结果', content: '2 个方法坚持 7 天，额头闭口全消了', desc: '方法数量 + 见效周期' },
    ],
  },
  {
    id: 'pain-solution',
    name: '痛点 + 方案型',
    items: [
      { id: 'ps1', title: '痛点提问+产品暗示', content: '毛孔粗大到能插秧？这瓶精华让我重新相信护肤', desc: '夸张痛点 + 转折方案' },
      { id: 'ps2', title: '职场痛点+万能框架', content: '每次写方案都被打回？试试这个万能框架', desc: '高频职场场景' },
      { id: 'ps3', title: '生活痛点+解决方案', content: '工资 5000 在杭州租房，我是怎么住上一居室的', desc: '具体金额+城市+结果' },
      { id: 'ps4', title: '肤质痛点+产品推荐', content: '混油皮的痛，终于找到解决办法了', desc: '精准人群+情绪共鸣' },
      { id: 'ps5', title: '身材焦虑+好物分享', content: '小肚腩真的减不掉？这个动作每天 5 分钟就够了', desc: '身材焦虑+极低门槛' },
    ],
  },
  {
    id: 'counter-intuitive',
    name: '反常识型',
    items: [
      { id: 'ci1', title: '颠覆护肤认知', content: '越勤快皮肤越差？皮肤科医生说你 80% 的护肤步骤都是多余的', desc: '权威背书 + 颠覆常识' },
      { id: 'ci2', title: '颠覆运动认知', content: '跑步根本不减肥，真正掉秤的运动是这个', desc: '否定常见认知 + 新方案' },
      { id: 'ci3', title: '颠覆金钱认知', content: '存款越多越焦虑？心理学家说这才是正常反应', desc: '反常识情绪认知' },
      { id: 'ci4', title: '颠覆减肥认知', content: '不运动不节食！吃瘦 18 斤的食谱竟被健身教练偷学', desc: '反常规操作+权威对立' },
      { id: 'ci5', title: '颠覆教育认知', content: '别再逼孩子背单词了！语言学家说这才是学英语的正确方式', desc: '家长焦虑+专家背书' },
    ],
  },
  {
    id: 'identity-scene',
    name: '身份 + 场景型',
    items: [
      { id: 'is1', title: '身份+建议', content: '30 岁裸辞的打工人，给即将辞职的你 5 条建议', desc: '身份标签+经验输出' },
      { id: 'is2', title: '身材+穿搭', content: '小个子梨形身材的夏天穿搭，这 6 套我闭眼入的', desc: '细分身材+场景穿搭' },
      { id: 'is3', title: '身份+清单', content: '新手妈妈的待产包清单，生完才知道这 8 样最有用', desc: '精准身份+实用清单' },
      { id: 'is4', title: '身份+攻略', content: '大一女生必看｜军训防晒全攻略，学姐的血泪经验', desc: '新生身份+避坑指南' },
      { id: 'is5', title: '职业+方法', content: '做自媒体 3 年，给想入行的你 10 条真心话', desc: '过来人身份+真诚分享' },
    ],
  },
  {
    id: 'urgency',
    name: '紧迫感型',
    items: [
      { id: 'ur1', title: '限量+行动号召', content: '这个百元平替快被买断货了，姐妹们冲', desc: '稀缺性+社交驱动' },
      { id: 'ur2', title: '节日+技巧', content: '双 11 囤货指南｜这 10 个凑单技巧再不看就晚了', desc: '时间节点+紧迫感' },
      { id: 'ur3', title: '倒计时+模板', content: '春招最后两周，这份简历模板救了我的面试', desc: '时间紧迫+资源救急' },
      { id: 'ur4', title: '限时+福利', content: '限时删！留学生都在抢的 50G 论文神器安装包', desc: '限时稀缺+人群标签' },
      { id: 'ur5', title: '即将+变化', content: '马上要涨价了！这个宝藏工具且用且珍惜', desc: '价格敏感+催促行动' },
    ],
  },
  {
    id: 'comparison',
    name: '对比型',
    items: [
      { id: 'co1', title: '品牌对比+效果', content: '大牌 vs 平替，200 块 get 同款妆效', desc: '价格对比+结果承诺' },
      { id: 'co2', title: '改造前后', content: '租房改造前后对比，房东看了都不敢涨价', desc: '强烈视觉反差' },
      { id: 'co3', title: '能力对比', content: '同样月薪 8000，会理财和不会理财的差距有多大', desc: '平行对比+观念冲击' },
      { id: 'co4', title: '时间纵比', content: '从月薪 5000 到 30000，我做了这 3 件事', desc: '个人成长路径' },
      { id: 'co5', title: '方案对比', content: '上了 3 万的私教课 vs 自己练，差距到底在哪', desc: '花钱 vs 省钱对比' },
    ],
  },
  {
    id: 'suspense',
    name: '悬念型',
    items: [
      { id: 'su1', title: '替换结果+省略号', content: '我把 SK-II 换成了一瓶 39 块的面霜，结果……', desc: '大牌换平价+悬念留白' },
      { id: 'su2', title: '离职后真相', content: '离职后我才发现，公司最不想让你知道的事', desc: '信息差+窥探欲' },
      { id: 'su3', title: '经历+领悟', content: '相亲 50 次后，我终于搞懂了一个道理', desc: '夸张次数+人生感悟' },
      { id: 'su4', title: '秘密+揭晓', content: '她为何能在一个月内瘦了 10 斤？方法你想不到', desc: '悬念提问+结果暗示' },
      { id: 'su5', title: '转折+意外', content: '我辞职回老家种田了，结果收入比以前高 3 倍', desc: '反常规选择+意外结果' },
    ],
  },
  {
    id: 'secrets',
    name: '揭秘型',
    items: [
      { id: 'se1', title: '内部秘密', content: '护肤品柜姐不会告诉你的 5 个省钱秘密', desc: '职业内部+省钱' },
      { id: 'se2', title: '行业黑幕', content: '装修行业的 10 个坑，设计师朋友偷偷告诉我的', desc: '行业潜规则+避坑' },
      { id: 'se3', title: '面试内幕', content: '前 HR 揭秘：面试官其实前 30 秒就做了决定', desc: '招聘内幕+干货' },
      { id: 'se4', title: '信息差赚钱', content: '新媒体人速存！把信息差变成摇钱树的 18 个野路子', desc: '赚钱信息差+收藏驱动' },
      { id: 'se5', title: '行业底价', content: '1688 同源工厂清单｜大牌成本的 1/10，真香', desc: '省钱渠道揭秘' },
    ],
  },
];

export const coverFormulaCategories: AssetCategory[] = [
  {
    id: 'big-text',
    name: '大字报型',
    items: [
      { id: 'bt1', title: '纯标题模板', content: '大标题 / 副标题 / 小标签', desc: '上：主标题（加粗） 中：副标题 下：分类标签' },
      { id: 'bt2', title: '数字标题模板', content: '3个技巧 / 大标题 / 必看', desc: '左上方大数字，右方主标题，底部小字标注' },
      { id: 'bt3', title: '问答标题模板', content: '你知道吗？ / 答案 / 真相', desc: '上：疑问句 下：简短答案 右下：标签' },
      { id: 'bt4', title: '情绪标题模板', content: '绝了 / 主标题 / 真心话', desc: '上：情绪词引爆 中：核心内容 下：补充说明' },
    ],
  },
  {
    id: 'before-after',
    name: '对比型',
    items: [
      { id: 'ba1', title: '改造前后模板', content: 'Before / After / 方法', desc: '左：改造前 右：改造后 下：用了什么方法' },
      { id: 'ba2', title: '价格对比模板', content: '大牌 XXX元 vs 平替 XX元', desc: '左右分屏对比，中间 vs，下方效果关键词' },
      { id: 'ba3', title: '能力对比模板', content: '以前的我 vs 现在的我', desc: '左：以前的痛点 右：现在的结果 中：→' },
    ],
  },
  {
    id: 'list-type',
    name: '清单型',
    items: [
      { id: 'lt1', title: '数量清单模板', content: 'XX 个 + 品类 + 合集推荐', desc: '上：数字（大号） 中：品类名 下：合集/指南/清单' },
      { id: 'lt2', title: '步骤清单模板', content: 'XX 步 + 目标 + 速成指南', desc: '上：步骤数量 中：目标结果 下：速成/懒人/小白' },
      { id: 'lt3', title: '测评对比模板', content: 'XX 款 + 品类 + 红黑榜', desc: '上：测评数量 中：品类 下：红榜/黑榜/避雷' },
    ],
  },
  {
    id: 'question',
    name: '疑问型',
    items: [
      { id: 'qn1', title: '痛点提问模板', content: '为什么你总是XX？答案在这里', desc: '上：痛点问题 下：答案预告/解决方案' },
      { id: 'qn2', title: '选择提问模板', content: '选A还是选B？我全都要！', desc: '上：二选一问题 下：反转答案' },
      { id: 'qn3', title: '攻略提问模板', content: '如何做到XXX？这几种方法你试试', desc: '上：怎么办/如何做 下：方法罗列' },
    ],
  },
];

export const emojiCategories: AssetCategory[] = [
  {
    id: 'beauty',
    name: '美妆护肤 💄',
    items: [
      { id: 'em1', title: '美妆通用组合', content: '💄🌸✨💧🌹', desc: '精致温柔风' },
      { id: 'em2', title: '护肤爱用组合', content: '💦🧴✨🌟🌸', desc: '清爽护肤感' },
      { id: 'em3', title: '试色分享组合', content: '💋💅🎨🪞🌈', desc: '彩妆试色风' },
      { id: 'em4', title: '空瓶记组合', content: '🧴💯✅📋🌟', desc: '好物推荐/空瓶' },
    ],
  },
  {
    id: 'food',
    name: '美食探店 🍜',
    items: [
      { id: 'em5', title: '美食诱惑组合', content: '🍜🔥😋🥢❤️‍🔥', desc: '深夜放毒风' },
      { id: 'em6', title: '探店打卡组合', content: '📍🏪✨☕🍰', desc: '探店打卡风' },
      { id: 'em7', title: '自制美食组合', content: '👩‍🍳🍳🥗✨🍴', desc: '自制/教程风' },
      { id: 'em8', title: '饮品甜品组合', content: '🧋🍦🍩☕🎀', desc: '甜品饮品风' },
    ],
  },
  {
    id: 'fashion',
    name: '穿搭时尚 👗',
    items: [
      { id: 'em9', title: '穿搭分享组合', content: '👗🎀💅🪞🛍️', desc: '穿搭分享风' },
      { id: 'em10', title: 'OOTD组合', content: '✨👠👜💫🌷', desc: '今日穿搭风' },
      { id: 'em11', title: '购物分享组合', content: '🛒🛍️💝🎁✨', desc: '开箱/购物分享' },
      { id: 'em12', title: '包包配饰组合', content: '👜👛⌚💍🌟', desc: '配饰分享风' },
    ],
  },
  {
    id: 'study',
    name: '学习干货 📚',
    items: [
      { id: 'em13', title: '效率学习组合', content: '📚💡✏️📝🎯', desc: '学习方法/效率' },
      { id: 'em14', title: '自律打卡组合', content: '⏰✅📊🔥💪', desc: '自律/打卡/目标' },
      { id: 'em15', title: '阅读分享组合', content: '📖☕🛋️💭🌟', desc: '书单/读后感' },
      { id: 'em16', title: '考证上岸组合', content: '📚🎓🏆💯🚀', desc: '考试/上岸/考证' },
    ],
  },
  {
    id: 'travel',
    name: '旅行攻略 🏖️',
    items: [
      { id: 'em17', title: '旅行打卡组合', content: '🏖️✈️📍🌅🗺️', desc: '旅行攻略/打卡' },
      { id: 'em18', title: '周末出游组合', content: '🌳☀️🧺🎵🌸', desc: '周末/野餐/户外' },
      { id: 'em19', title: '酒店民宿组合', content: '🏨🛏️🌊☕📸', desc: '酒店/民宿测评' },
      { id: 'em20', title: 'citywalk组合', content: '🚶‍♀️☕📸🌆✨', desc: '城市漫步/街拍' },
    ],
  },
  {
    id: 'general',
    name: '通用装饰 🌟',
    items: [
      { id: 'em21', title: '闪亮装饰组合', content: '⭐🌟💫✨💕', desc: '通用点缀风' },
      { id: 'em22', title: '爱心系列组合', content: '💕💞💓💖💗', desc: '情感/温暖向' },
      { id: 'em23', title: '重点强调组合', content: '🔥⚡💥🎯‼️', desc: '强调/重要提醒' },
      { id: 'em24', title: '箭头引导组合', content: '👉➡️👇⬇️📌', desc: '引导视线/列表' },
      { id: 'em25', title: '序号标题组合', content: '❶❷❸❹❺', desc: '分点/步骤/清单' },
    ],
  },
];

export const endingCategories: AssetCategory[] = [
  {
    id: 'question-cta',
    name: '提问互动型',
    items: [
      { id: 'qc1', title: '选择题式提问', content: '如果是你，你会怎么选？评论区告诉我👇', desc: '引发站队讨论' },
      { id: 'qc2', title: '经历征集提问', content: '你有没有类似的经历？来评论区聊聊～', desc: '引发故事分享' },
      { id: 'qc3', title: '偏好选择提问', content: '你更喜欢哪个？1还是2？快告诉我！', desc: '二选一，降低评论门槛' },
      { id: 'qc4', title: '排雷征集提问', content: '你们还踩过哪些坑？一起帮姐妹们避雷💪', desc: '负面经验征集' },
      { id: 'qc5', title: '反差提问', content: '只有我一个人这么觉得吗？🙋‍♀️', desc: '引发认同/反驳' },
    ],
  },
  {
    id: 'save-cta',
    name: '收藏引导型',
    items: [
      { id: 'sc1', title: '直接收藏引导', content: '先收藏再说，万一以后用得上呢？⭐', desc: '低门槛收藏驱动' },
      { id: 'sc2', title: '需要时再看', content: '存下来，需要的时候直接拿出来用📌', desc: '实用性引导收藏' },
      { id: 'sc3', title: '告别吃灰式', content: '别让它待在收藏夹吃灰，今天就试试看💪', desc: '鼓励行动' },
      { id: 'sc4', title: '转发艾特式', content: '@ 那个总说你做不到的人，告诉他你可以🔥', desc: '社交互动+收藏' },
      { id: 'sc5', title: '闺蜜分享式', content: '快转给你的闺蜜/兄弟，一起冲！👯‍♀️', desc: '社交裂变驱动' },
    ],
  },
  {
    id: 'quote-cta',
    name: '共鸣金句型',
    items: [
      { id: 'qt1', title: '成长金句', content: '种一棵树最好的时间是十年前，其次是现在🌱', desc: '励志/成长收尾' },
      { id: 'qt2', title: '自爱金句', content: '你不是懒，你只是还没找到对的方法。别放弃❤️', desc: '暖心治愈收尾' },
      { id: 'qt3', title: '行动金句', content: '知道和做到之间，差的只是一次开始🚀', desc: '激励行动收尾' },
      { id: 'qt4', title: '心态金句', content: '不是厉害了才开始，是开始了才厉害💪', desc: '突破心理障碍' },
      { id: 'qt5', title: '选择金句', content: '选择比努力更重要，但努力才能让你有得选✨', desc: '辩证思考收尾' },
    ],
  },
  {
    id: 'twist-cta',
    name: '反转收尾型',
    items: [
      { id: 'tw1', title: '利益反转', content: '说了这么多，其实最重要的是——先行动起来！不然看再多也没用😅', desc: '从道理转向行动' },
      { id: 'tw2', title: '自我调侃反转', content: '写了这么多，其实我自己也没完全做到……一起努力吧😂', desc: '卸下权威感' },
      { id: 'tw3', title: '真相揭露反转', content: '说这么多，真相就是：没有一夜爆红，只有日积月累。共勉🔥', desc: '从技巧转向本质' },
      { id: 'tw4', title: '反套路反转', content: '你以为我要推荐产品？不，这招完全免费，拿走不谢😎', desc: '打破预期' },
      { id: 'tw5', title: '轻松收尾反转', content: '看完觉得有用？那就——快去试试！别光收藏不动啊喂！🙈', desc: '俏皮催促行动' },
    ],
  },
];

export function getAllAssetCategories() {
  return [
    { id: 'hooks', name: '开头钩子', icon: 'hook', categories: hookCategories },
    { id: 'covers', name: '封面公式', icon: 'cover', categories: coverFormulaCategories },
    { id: 'emojis', name: 'Emoji', icon: 'emoji', categories: emojiCategories },
    { id: 'endings', name: '互动结尾', icon: 'end', categories: endingCategories },
  ] as const;
}

export function getAssetById(id: string): AssetItem | undefined {
  const all = [...hookCategories, ...coverFormulaCategories, ...emojiCategories, ...endingCategories];
  for (const cat of all) {
    const found = cat.items.find(i => i.id === id);
    if (found) return found;
  }
  return undefined;
}
