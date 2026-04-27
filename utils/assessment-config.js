const questions = [
  {
    id: "Q01",
    dimension: "EI",
    stem: "参加完一场热闹的社交聚会后，你通常：",
    options: [
      { key: "A", text: "感觉像充了电，心情依然很兴奋。" },
      { key: "B", text: "感觉电量耗尽，急需一个人待着安静一下。" },
    ],
    optionLetterMapping: { A: "E", B: "I" },
  },
  {
    id: "Q02",
    dimension: "EI",
    stem: "在进入一个新圈子或讨论组时，你通常：",
    options: [
      { key: "A", text: "习惯先发表看法，在交流中整理思路。" },
      { key: "B", text: "习惯先听别人怎么说，等想清楚了再开口。" },
    ],
    optionLetterMapping: { A: "E", B: "I" },
  },
  {
    id: "Q03",
    dimension: "EI",
    stem: "当你在生活中遇到棘手的麻烦时，你更倾向于：",
    options: [
      { key: "A", text: "找人倾诉或讨论，通过对话寻找灵感。" },
      { key: "B", text: "自己先想清楚，等有了头绪再告诉别人。" },
    ],
    optionLetterMapping: { A: "E", B: "I" },
  },
  {
    id: "Q04",
    dimension: "EI",
    stem: "你心目中理想的周末活动是：",
    options: [
      { key: "A", text: "约上一帮朋友去户外或参加热闹的市集。" },
      { key: "B", text: "约上一两个知心好友，找个安静的地方深谈。" },
    ],
    optionLetterMapping: { A: "E", B: "I" },
  },
  {
    id: "Q05",
    dimension: "EI",
    stem: "当你在一个完全陌生的环境中需要获取帮助时：",
    options: [
      { key: "A", text: "倾向于直接找个看起来面善的人开口询问。" },
      { key: "B", text: "倾向于先自己查或研究，实在没办法再开口。" },
    ],
    optionLetterMapping: { A: "E", B: "I" },
  },
  {
    id: "Q06",
    dimension: "SN",
    stem: "如果要学习一项新技能，你更喜欢哪种教学方式：",
    options: [
      { key: "A", text: "老师给出明确的、步骤清晰的说明。" },
      { key: "B", text: "老师只给大框架，剩下的让自己去摸索尝试。" },
    ],
    optionLetterMapping: { A: "S", B: "N" },
  },
  {
    id: "Q07",
    dimension: "SN",
    stem: "当你走在一条熟悉的街道上，你更容易发现：",
    options: [
      { key: "A", text: "哪家店关门了、哪棵树修剪了这种细节变化。" },
      { key: "B", text: "这里的消费趋势变了、或者某种潜在的商机。" },
    ],
    optionLetterMapping: { A: "S", B: "N" },
  },
  {
    id: "Q08",
    dimension: "SN",
    stem: "当有人向你描述一个复杂的商业模式时，你更想：",
    options: [
      { key: "A", text: "听他举一个具体的落地案例。" },
      { key: "B", text: "先理解他背后的核心逻辑和宏观概念。" },
    ],
    optionLetterMapping: { A: "S", B: "N" },
  },
  {
    id: "Q09",
    dimension: "SN",
    stem: "在工作中处理任务时，你更信任：",
    options: [
      { key: "A", text: "过去的成功经验和已经掌握的实操数据。" },
      { key: "B", text: "自己的直觉判断和未来可能出现的各种机会。" },
    ],
    optionLetterMapping: { A: "S", B: "N" },
  },
  {
    id: "Q10",
    dimension: "SN",
    stem: "你如何看待“空想”这件事：",
    options: [
      { key: "A", text: "觉得没意义，人应该把精力花在解决具体问题上。" },
      { key: "B", text: "觉得很有趣，很多伟大的蓝图最初都来自脑洞。" },
    ],
    optionLetterMapping: { A: "S", B: "N" },
  },
  {
    id: "Q11",
    dimension: "TF",
    stem: "在同事或合作伙伴眼中，你通常被认为：",
    options: [
      { key: "A", text: "理性、果断，甚至偶尔会显得有些不近人情。" },
      { key: "B", text: "温暖、体贴，总是能照顾到大多数人的感受。" },
    ],
    optionLetterMapping: { A: "T", B: "F" },
  },
  {
    id: "Q12",
    dimension: "TF",
    stem: "你认为做出一份好的方案，最核心的标准是：",
    options: [
      { key: "A", text: "逻辑严密，事实胜于雄辩。" },
      { key: "B", text: "能引起大家的情绪共鸣，让大家都满意。" },
    ],
    optionLetterMapping: { A: "T", B: "F" },
  },
  {
    id: "Q13",
    dimension: "TF",
    stem: "如果你最好的朋友犯了一个低级错误，你第一反应是：",
    options: [
      { key: "A", text: "帮他客观分析为什么会错，下次怎么避免。" },
      { key: "B", text: "察觉他现在肯定很难过，先安慰他的情绪。" },
    ],
    optionLetterMapping: { A: "T", B: "F" },
  },
  {
    id: "Q14",
    dimension: "TF",
    stem: "面对一个重大决定，你最终会听从：",
    options: [
      { key: "A", text: "冷静的逻辑推导和客观的事实依据。" },
      { key: "B", text: "自己的价值观以及这个决定对他人的影响。" },
    ],
    optionLetterMapping: { A: "T", B: "F" },
  },
  {
    id: "Q15",
    dimension: "TF",
    stem: "在讨论一个争议话题时，你更看重：",
    options: [
      { key: "A", text: "谁的逻辑更严密、证据更确凿。" },
      { key: "B", text: "大家是否达成共识，场面是否和谐。" },
    ],
    optionLetterMapping: { A: "T", B: "F" },
  },
  {
    id: "Q16",
    dimension: "JP",
    stem: "观察你的书桌或电脑桌面，通常呈现的状态是：",
    options: [
      { key: "A", text: "分类明确，东西都放在该放的位置。" },
      { key: "B", text: "乱中有序，虽然看起来杂乱但能精准找到东西。" },
    ],
    optionLetterMapping: { A: "J", B: "P" },
  },
  {
    id: "Q17",
    dimension: "JP",
    stem: "面对一个紧急截止的任务，你更有可能：",
    options: [
      { key: "A", text: "提前几天就陆陆续续做完，留出复核时间。" },
      { key: "B", text: "一直拖到最后深夜，靠死线前的肾上腺素爆发。" },
    ],
    optionLetterMapping: { A: "J", B: "P" },
  },
  {
    id: "Q18",
    dimension: "JP",
    stem: "哪种职场环境最让你抓狂：",
    options: [
      { key: "A", text: "计划总是变来变去，没有确定的流程。" },
      { key: "B", text: "每天的时间被死死卡住，没有任何灵活性。" },
    ],
    optionLetterMapping: { A: "J", B: "P" },
  },
  {
    id: "Q19",
    dimension: "JP",
    stem: "关于出门旅行，你的习惯通常是：",
    options: [
      { key: "A", text: "提前订好机票酒店，做好每天的打卡攻略。" },
      { key: "B", text: "只定个大概目的地，剩下的边走边看随心所欲。" },
    ],
    optionLetterMapping: { A: "J", B: "P" },
  },
  {
    id: "Q20",
    dimension: "JP",
    stem: "如果明天的原定计划突然取消了，你通常：",
    options: [
      { key: "A", text: "会感到有些不安或焦虑，感觉节奏乱了。" },
      { key: "B", text: "觉得挺开心的，突然多出了一段自由时间。" },
    ],
    optionLetterMapping: { A: "J", B: "P" },
  },
];

const assessmentConfig = {
  id: "mbti_ai_value",
  name: "16 型人格（MBTI）未来竞争力深度测评",
  themeTitle: "你的MBTI在 AI 时代值多少钱",
  reportTitle: "AI 时代 MBTI 价值评估报告",
  welcomeCopyPool: [
    "在时代海啸中，你的性格是最后的避风港。",
    "别再用旧规则，衡量新时代的自己。",
    "看懂你的性格基因，找到独一无二的生态位。",
    "AI 时代没有平庸，只有未被变现的天赋。",
    "当算法开始模拟人性，你的独特性还剩多少？",
    "时代在变，你的性格还扛得住这波 AI 吗？",
    "你以为的小缺点，可能是 AI 最学不来的超能力。",
    "别急着下定论，你的性格比你想得值钱。",
    "AI 会复制技能，却永远复刻不了你的怪癖。",
    "或许，你还不知道自己有多厉害。",
  ],
  startCopy:
    "你好，我是你的性格资本分析师。我将带你穿透表象，评估你的认知模式、能量边界与性格护城河。请深呼吸，回答几个关键问题，测测你的MBTI在 AI 时代值多少钱。",
  endCopy:
    "恭喜通关！你的《AI 时代性格资本报告》已生成。我们不仅识别了你的风险曲线，还找到了 AI 无法模拟的那部分独特天赋。想把性格变成竞争力，让 AI 成为你的外挂？你的答案，正在报告里等你开启。",
  shareCopyPool: [
    "性格没有优劣，只有放错位置的资产。测测你的 MBTI 隐藏天赋，拿回属于你的财富说明书。",
    "别让 AI 成为你的噩梦，让它成为你的垫脚石！",
  ],
  questionCount: questions.length,
  questions,
};

module.exports = {
  assessmentConfig,
  questions,
};
