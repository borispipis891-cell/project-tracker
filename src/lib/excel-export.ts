import ExcelJS, { type Cell, type Worksheet } from 'exceljs';

export interface ExcelExportTask {
  title: string;
  status: string;
  receivedAt?: string;
  deadline?: string;
  responsible?: string;
  engineer?: string;
}

export interface ExcelExportProject {
  name: string;
  customer?: string;
  pss?: string;
  reg?: string;
  status: string;
  priority: string;
  receivedAt?: string;
  deadline?: string;
  responsible?: string;
  engineer?: string;
  tasks: ExcelExportTask[];
}

export interface ExcelExportLabels {
  projectStatuses: Record<string, string>;
  priorities: Record<string, string>;
  taskStatuses: Record<string, string>;
}

type BadgeColors = {
  fill: string;
  text: string;
};

const COLORS = {
  navy: 'FF17365D',
  blue: 'FF4472C4',
  paleBlue: 'FFDDEBF7',
  stripe: 'FFF5F8FC',
  border: 'FFD9E2F3',
  muted: 'FF667085',
  white: 'FFFFFFFF',
  overdueFill: 'FFFDE8E7',
  overdueText: 'FFB42318',
  upcomingFill: 'FFFFF4CC',
  upcomingText: 'FF8A6100',
};

const PROJECT_STATUS_COLORS: Record<string, BadgeColors> = {
  new: { fill: 'FFE7EAF0', text: 'FF344054' },
  progress: { fill: 'FFDCE9FF', text: 'FF175CD3' },
  done: { fill: 'FFDDF6E8', text: 'FF067647' },
  blocked: { fill: 'FFDDF3FA', text: 'FF0E7090' },
  waiting: { fill: 'FFFFF1C2', text: 'FF8A6100' },
};

const TASK_STATUS_COLORS: Record<string, BadgeColors> = {
  not_started: { fill: 'FFE7EAF0', text: 'FF344054' },
  progress: { fill: 'FFDCE9FF', text: 'FF175CD3' },
  blocked: { fill: 'FFDDF3FA', text: 'FF0E7090' },
  review: { fill: 'FFF0E3FF', text: 'FF6941C6' },
  done: { fill: 'FFDDF6E8', text: 'FF067647' },
};

const PRIORITY_COLORS: Record<string, BadgeColors> = {
  critical: { fill: 'FFFDE2E1', text: 'FFB42318' },
  high: { fill: 'FFFFE8D6', text: 'FFB54708' },
  medium: { fill: 'FFFFF1C2', text: 'FF8A6100' },
  low: { fill: 'FFDDF6E8', text: 'FF067647' },
};

const PROJECT_HEADERS = [
  'Проект',
  'Заказчик',
  'PSS',
  'Регистрация',
  'Статус',
  'Приоритет',
  'Дата поступления',
  'Дедлайн',
  'Ответственный',
  'Инженер',
  'Количество задач',
  'Выполнено задач',
  'Готовность',
];

const TASK_HEADERS = [
  'Проект',
  'Задача',
  'Статус',
  'Дата поступления',
  'Дедлайн',
  'Ответственный',
  'Инженер',
];

const toExcelDate = (value?: string): Date | null => {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const fileDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const setBadgeStyle = (cell: Cell, colors?: BadgeColors) => {
  if (!colors) return;

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.fill },
  };
  cell.font = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: colors.text },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
};

const setDeadlineStyle = (cell: Cell, value: string | undefined, completed: boolean, today: Date) => {
  if (completed) return;

  const deadline = toExcelDate(value);
  if (!deadline) return;

  const differenceInDays = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
  if (differenceInDays < 0) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.overdueFill },
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.overdueText } };
  } else if (differenceInDays <= 7) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.upcomingFill },
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.upcomingText } };
  }
};

const prepareWorksheet = (
  worksheet: Worksheet,
  title: string,
  subtitle: string,
  headers: string[],
  widths: number[],
) => {
  worksheet.columns = widths.map(width => ({ width }));
  worksheet.views = [{
    state: 'frozen',
    xSplit: 1,
    ySplit: 5,
    topLeftCell: 'B6',
    activeCell: 'B6',
    showGridLines: false,
  }];
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    printTitlesRow: '1:5',
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
  worksheet.headerFooter.oddFooter = '&LProject Tracker&CСтраница &P из &N&R&D';

  worksheet.mergeCells(2, 1, 2, headers.length);
  const titleCell = worksheet.getCell(2, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.navy } };
  titleCell.alignment = { vertical: 'middle' };
  worksheet.getRow(2).height = 27;

  worksheet.mergeCells(3, 1, 3, headers.length);
  const subtitleCell = worksheet.getCell(3, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.muted } };
  subtitleCell.alignment = { vertical: 'middle' };
  worksheet.getRow(3).height = 20;

  const headerRow = worksheet.getRow(5);
  headerRow.values = headers;
  headerRow.height = 31;
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.navy },
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: COLORS.blue } },
    };
  });

  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: headers.length },
  };
};

const styleDataRow = (worksheet: Worksheet, rowNumber: number, columnCount: number) => {
  const row = worksheet.getRow(rowNumber);
  row.height = 23;

  for (let column = 1; column <= columnCount; column += 1) {
    const cell = row.getCell(column);
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF24324A' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: COLORS.border } },
    };

    if (rowNumber % 2 === 0) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.stripe },
      };
    }
  }
};

export const buildProjectsWorkbook = (
  projects: ExcelExportProject[],
  labels: ExcelExportLabels,
): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook();
  const createdAt = new Date();
  const today = new Date(Date.UTC(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()));
  const taskCount = projects.reduce((total, project) => total + project.tasks.length, 0);
  const completedTaskCount = projects.reduce(
    (total, project) => total + project.tasks.filter(task => task.status === 'done').length,
    0,
  );
  const generatedLabel = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(createdAt);

  workbook.creator = 'Project Tracker';
  workbook.lastModifiedBy = 'Project Tracker';
  workbook.created = createdAt;
  workbook.modified = createdAt;
  workbook.title = 'Отчёт по проектам';
  workbook.subject = 'Проекты и задачи';
  workbook.company = 'Project Tracker';

  const projectsSheet = workbook.addWorksheet('Проекты', {
    properties: { defaultRowHeight: 20, tabColor: { argb: COLORS.blue } },
  });
  prepareWorksheet(
    projectsSheet,
    'Отчёт по проектам',
    `Сформирован: ${generatedLabel}  •  Проектов: ${projects.length}  •  Задач: ${taskCount}  •  Выполнено: ${completedTaskCount}`,
    PROJECT_HEADERS,
    [30, 22, 15, 17, 18, 16, 16, 16, 22, 20, 15, 16, 14],
  );

  projects.forEach((project, index) => {
    const rowNumber = index + 6;
    const completedTasks = project.tasks.filter(task => task.status === 'done').length;
    const completion = project.tasks.length > 0 ? completedTasks / project.tasks.length : 0;
    const row = projectsSheet.getRow(rowNumber);
    row.values = [
      project.name,
      project.customer || null,
      project.pss || null,
      project.reg || null,
      labels.projectStatuses[project.status] || project.status,
      labels.priorities[project.priority] || project.priority,
      toExcelDate(project.receivedAt),
      toExcelDate(project.deadline),
      project.responsible || null,
      project.engineer || null,
      project.tasks.length,
      completedTasks,
      completion,
    ];
    styleDataRow(projectsSheet, rowNumber, PROJECT_HEADERS.length);

    row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.navy } };
    setBadgeStyle(row.getCell(5), PROJECT_STATUS_COLORS[project.status]);
    setBadgeStyle(row.getCell(6), PRIORITY_COLORS[project.priority]);
    row.getCell(7).numFmt = 'dd.mm.yyyy';
    row.getCell(8).numFmt = 'dd.mm.yyyy';
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(13).numFmt = '0%';
    row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
    setDeadlineStyle(row.getCell(8), project.deadline, project.status === 'done', today);
  });

  const tasksSheet = workbook.addWorksheet('Задачи', {
    properties: { defaultRowHeight: 20, tabColor: { argb: 'FF70AD47' } },
  });
  prepareWorksheet(
    tasksSheet,
    'Задачи по проектам',
    `Сформирован: ${generatedLabel}  •  Всего задач: ${taskCount}  •  Выполнено: ${completedTaskCount}`,
    TASK_HEADERS,
    [30, 42, 19, 16, 16, 22, 20],
  );

  let taskRowNumber = 6;
  projects.forEach(project => {
    project.tasks.forEach(task => {
      const row = tasksSheet.getRow(taskRowNumber);
      row.values = [
        project.name,
        task.title,
        labels.taskStatuses[task.status] || task.status,
        toExcelDate(task.receivedAt),
        toExcelDate(task.deadline),
        task.responsible || null,
        task.engineer || null,
      ];
      styleDataRow(tasksSheet, taskRowNumber, TASK_HEADERS.length);

      row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.navy } };
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF24324A' } };
      setBadgeStyle(row.getCell(3), TASK_STATUS_COLORS[task.status]);
      row.getCell(4).numFmt = 'dd.mm.yyyy';
      row.getCell(5).numFmt = 'dd.mm.yyyy';
      setDeadlineStyle(row.getCell(5), task.deadline, task.status === 'done', today);

      taskRowNumber += 1;
    });
  });

  return workbook;
};

export const downloadProjectsWorkbook = async (
  projects: ExcelExportProject[],
  labels: ExcelExportLabels,
) => {
  const workbook = buildProjectsWorkbook(projects, labels);
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `проекты_${fileDate(new Date())}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
