const gradeValue = { A: 5, B: 4, C: 3, D: 2, E: 1, None: 0 };
const grades = ['A', 'B', 'C', 'D', 'E', 'None'];
const minGrade = 'B';
console.log(grades.filter(g => gradeValue[g] >= gradeValue[minGrade]));
console.log(grades.filter(g => gradeValue[g] < gradeValue[minGrade]));
