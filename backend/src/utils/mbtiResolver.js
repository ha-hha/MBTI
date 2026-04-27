const VALID_MBTI_TYPES = new Set([
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
]);

function resolveMbtiType(questions, answers) {
  const questionMap = questions.reduce((accumulator, question) => {
    accumulator[question.id] = question;
    return accumulator;
  }, {});

  const counts = {
    EI: { E: 0, I: 0 },
    SN: { S: 0, N: 0 },
    TF: { T: 0, F: 0 },
    JP: { J: 0, P: 0 },
  };

  answers.forEach((answer) => {
    const question = questionMap[answer.questionId];
    const letter = question.optionLetterMapping[answer.selectedOption];
    counts[question.dimension][letter] += 1;
  });

  const mbtiType = [
    counts.EI.E >= 3 ? "E" : "I",
    counts.SN.S >= 3 ? "S" : "N",
    counts.TF.T >= 3 ? "T" : "F",
    counts.JP.J >= 3 ? "J" : "P",
  ].join("");

  if (!VALID_MBTI_TYPES.has(mbtiType)) {
    throw new Error("INVALID_MBTI_TYPE");
  }

  return mbtiType;
}

module.exports = {
  VALID_MBTI_TYPES,
  resolveMbtiType,
};
