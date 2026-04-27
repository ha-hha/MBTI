const moduleTitles = {
  asset_overview: "性格资产总评",
  talent_strengths: "你的天才所在",
  substitution_risks: "替代风险",
  career_path: "职业认证与阶层跃迁建议",
};

const roleByEnergy = {
  E: "外部节奏发动者",
  I: "深度结构整合者",
};

const moatByPerception = {
  S: "现实细节与执行质感",
  N: "趋势想象与模式洞察",
};

const collaborationByDecision = {
  T: "把复杂问题压缩成清晰判断",
  F: "把多人协作稳定在可持续关系里",
};

const actionByLifestyle = {
  J: "让流程收口并推动落地",
  P: "在变化里抓住机会并持续迭代",
};

function getParts(mbtiType) {
  return {
    energy: mbtiType[0],
    perception: mbtiType[1],
    decision: mbtiType[2],
    lifestyle: mbtiType[3],
  };
}

function buildModules(mbtiType) {
  const parts = getParts(mbtiType);
  const role = roleByEnergy[parts.energy];
  const moat = moatByPerception[parts.perception];
  const decisionValue = collaborationByDecision[parts.decision];
  const actionValue = actionByLifestyle[parts.lifestyle];

  return [
    {
      key: "asset_overview",
      title: moduleTitles.asset_overview,
      items: [
        `你的 MBTI 类型是 ${mbtiType}，在 AI 协作链条中更像${role}，能把个人优势迅速投射到具体场景里。`,
        `你的核心人性护城河来自${moat}，这让你在工具趋同的阶段依然保有清晰辨识度。`,
        `你在组织中的关键位置是把${decisionValue}与${actionValue}接起来，让系统真正形成结果。`,
      ],
    },
    {
      key: "talent_strengths",
      title: moduleTitles.talent_strengths,
      items: [
        `你擅长在复杂情境里迅速识别重点，把模糊任务转成可推进的清晰动作。`,
        `你具备稳定的人机协作感，知道哪些判断应交给工具，哪些关键选择必须掌握在自己手里。`,
        `你最强的价值不在重复执行，而在于把认知、协作和节奏压缩成别人可直接使用的方法。`,
      ],
    },
    {
      key: "substitution_risks",
      title: moduleTitles.substitution_risks,
      items: [
        `当你过度依赖既有优势时，容易在新工具切换期出现惯性盲区，导致节奏被更快的系统抢走。`,
        `当输出只停留在经验层，你的价值会被通用型自动化稀释，难以继续抬高个人不可替代性。`,
        `AI 提效建议：让模型承担资料整理和初稿生成，你聚焦判断标准、协作接口与最后收口。`,
      ],
    },
    {
      key: "career_path",
      title: moduleTitles.career_path,
      items: [
        `你适合优先补强提示工程、流程设计、知识组织这类认证或能力方向，把天赋沉淀成可验证资产。`,
        `你的升级方向不是单纯做得更快，而是从执行者走向 AI 协同流程设计者或决策接口拥有者。`,
        `路径建议：固化个人方法论 -> 建立可复用模板库 -> 补齐 AI 协作认证 -> 进入更高层级的协作岗位。`,
      ],
    },
  ];
}

function createReport(recordId, mbtiType, themeTitle, reportTitle) {
  return {
    recordId,
    themeTitle,
    reportTitle,
    mbtiType,
    modules: buildModules(mbtiType),
  };
}

module.exports = {
  createReport,
};
