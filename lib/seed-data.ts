import type { EditableItem } from '@/lib/types';

const options = (values: string[], correct: number) => values.map((content, order) => ({ content, order, isCorrect: order === correct }));

export const historyItems: EditableItem[] = [
  { question: 'Đảng Cộng sản Việt Nam được thành lập vào ngày nào?', answer: '3/2/1930', explanation: 'Hội nghị hợp nhất các tổ chức cộng sản do Nguyễn Ái Quốc chủ trì.', options: options(['3/2/1930', '2/9/1945', '19/8/1945', '7/5/1954'], 0) },
  { question: 'Ai là người chủ trì Hội nghị thành lập Đảng đầu năm 1930?', answer: 'Nguyễn Ái Quốc', options: options(['Trần Phú', 'Nguyễn Ái Quốc', 'Lê Hồng Phong', 'Hà Huy Tập'], 1) },
  { question: 'Ban Chấp hành Trung ương Đảng chủ trương thành lập nước Việt Nam Dân chủ Cộng hòa tại Hội nghị nào?', answer: 'Hội nghị Trung ương VIII tháng 5/1941', explanation: 'Hội nghị xác định giải phóng dân tộc là nhiệm vụ bức thiết nhất.', options: options(['Hội nghị tháng 10/1930', 'Hội nghị Trung ương VI tháng 11/1939', 'Hội nghị Trung ương VII tháng 11/1940', 'Hội nghị Trung ương VIII tháng 5/1941'], 3) },
  { question: 'Mặt trận Việt Minh được thành lập vào năm nào?', answer: '1941', options: options(['1930', '1936', '1941', '1945'], 2) },
  { question: 'Cách mạng Tháng Tám thành công vào năm nào?', answer: '1945' },
  { question: 'Nước Việt Nam Dân chủ Cộng hòa ra đời ngày nào?', answer: '2/9/1945', explanation: 'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.' },
  { question: 'Chiến thắng Điện Biên Phủ diễn ra vào ngày nào?', answer: '7/5/1954', options: options(['19/12/1946', '7/5/1954', '21/7/1954', '2/9/1945'], 1) },
  { question: 'Hiệp định Genève về Đông Dương được ký kết năm nào?', answer: '1954' },
  { question: 'Đại hội đại biểu toàn quốc lần thứ III của Đảng diễn ra năm nào?', answer: '1960', options: options(['1951', '1960', '1976', '1986'], 1) },
  { question: 'Chiến dịch Hồ Chí Minh kết thúc thắng lợi vào ngày nào?', answer: '30/4/1975' },
  { question: 'Đại hội nào khởi xướng đường lối đổi mới toàn diện đất nước?', answer: 'Đại hội VI (1986)', explanation: 'Đại hội VI mở đầu công cuộc đổi mới.', options: options(['Đại hội IV', 'Đại hội V', 'Đại hội VI', 'Đại hội VII'], 2) },
  { question: 'Cương lĩnh xây dựng đất nước trong thời kỳ quá độ lên chủ nghĩa xã hội được thông qua lần đầu năm nào?', answer: '1991' },
  { question: 'Tư tưởng cốt lõi của Cương lĩnh chính trị đầu tiên là gì?', answer: 'Độc lập dân tộc gắn liền với chủ nghĩa xã hội' },
  { question: 'Lời kêu gọi Toàn quốc kháng chiến được Chủ tịch Hồ Chí Minh phát động ngày nào?', answer: '19/12/1946' },
  { question: 'Phong trào dân chủ 1936–1939 tập trung vào mục tiêu trực tiếp nào?', answer: 'Dân sinh, dân chủ, hòa bình', options: options(['Giành độc lập ngay lập tức', 'Dân sinh, dân chủ, hòa bình', 'Cải cách ruộng đất', 'Thống nhất đất nước'], 1) },
  { question: 'Đường Trường Sơn được mở vào năm nào?', answer: '1959' },
  { question: 'Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký năm nào?', answer: '1973', options: options(['1968', '1972', '1973', '1975'], 2) },
  { question: 'Mục tiêu tổng quát của công cuộc đổi mới là gì?', answer: 'Dân giàu, nước mạnh, dân chủ, công bằng, văn minh' },
];

export const englishItems: EditableItem[] = [
  { question: 'How do you say “Rất vui được gặp bạn” in English?', answer: 'Nice to meet you', options: options(['See you later', 'Nice to meet you', 'You are welcome', 'Take care'], 1) },
  { question: 'What does “Could you help me?” mean?', answer: 'Bạn có thể giúp tôi không?' },
  { question: 'Choose the polite way to ask for water.', answer: 'Could I have some water, please?', options: options(['Give me water.', 'I want water now.', 'Could I have some water, please?', 'Where water?'], 2) },
  { question: 'What is the opposite of “expensive”?', answer: 'Cheap', options: options(['Cheap', 'Large', 'Quiet', 'Busy'], 0) },
  { question: 'How do you ask for directions to the station?', answer: 'How can I get to the station?' },
  { question: 'What does “I’m looking forward to it” mean?', answer: 'Tôi đang mong chờ điều đó' },
  { question: 'Complete: “What time ___ the meeting start?”', answer: 'does', options: options(['do', 'does', 'is', 'has'], 1) },
  { question: 'How do you respond to “Thank you”?', answer: 'You’re welcome', options: options(['Never mind', 'You’re welcome', 'Excuse me', 'I’m sorry'], 1) },
];
