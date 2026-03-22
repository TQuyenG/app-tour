export type TourCategory =
  | 'Biển đảo'
  | 'Núi rừng'
  | 'Văn hóa'
  | 'Gia đình'
  | 'Nghỉ dưỡng'
  | 'Phiêu lưu';

export type TourItem = {
  id: string;
  name: string;
  category: TourCategory;
  departure: string;
  date: string;
  duration: string;
  groupType: string;
  seatsLeft: number;
  price: string;
  rating: number;
  summary: string;
  itinerary: string[];
  includes: string[];
  tags: string[];
  color: string;
};

export type GuideReview = {
  user: string;
  text: string;
  stars: number;
};

export type GuideItem = {
  id: string;
  name: string;
  location: string;
  match: number;
  rating: number;
  tours: number;
  experience: string;
  skills: string[];
  languages: string[];
  halfDayPrice: string;
  fullDayPrice: string;
  bio: string;
  reviews: GuideReview[];
  verified: boolean;
};

export const TOUR_CATEGORIES: TourCategory[] = ['Biển đảo', 'Núi rừng', 'Văn hóa', 'Gia đình', 'Nghỉ dưỡng', 'Phiêu lưu'];

export const TOURS: TourItem[] = [
  {
    id: 't1',
    name: 'Đà Lạt 3N2Đ - Săn mây & Chill',
    category: 'Núi rừng',
    departure: 'TP.HCM',
    date: '18/04/2026',
    duration: '3 ngày 2 đêm',
    groupType: 'Nhóm nhỏ',
    seatsLeft: 9,
    price: '2.990.000đ',
    rating: 4.8,
    summary: 'Săn mây, cà phê rừng thông, vườn hoa và check-in cao nguyên.',
    itinerary: ['Ngày 1: Check-in trung tâm, dạo hồ Xuân Hương', 'Ngày 2: Đồi chè Cầu Đất, săn mây sáng sớm', 'Ngày 3: Chợ Đà Lạt, mua đặc sản và trở về'],
    includes: ['Xe đưa đón', 'Khách sạn 3 sao', 'Ăn sáng', 'Vé tham quan chính', 'Bảo hiểm du lịch'],
    tags: ['Săn mây', 'Chụp ảnh', 'Ẩm thực'],
    color: '#99bbff',
  },
  {
    id: 't2',
    name: 'Phú Quốc 4N3Đ - Resort biển xanh',
    category: 'Nghỉ dưỡng',
    departure: 'Hà Nội',
    date: '22/04/2026',
    duration: '4 ngày 3 đêm',
    groupType: 'Cặp đôi',
    seatsLeft: 6,
    price: '4.690.000đ',
    rating: 4.9,
    summary: 'Nghỉ dưỡng biển, ngắm hoàng hôn Sunset Town và lặn ngắm san hô.',
    itinerary: ['Ngày 1: Nhận phòng resort, dạo biển', 'Ngày 2: Cano 4 đảo, lặn san hô', 'Ngày 3: Sunset Town, cáp treo Hòn Thơm', 'Ngày 4: Mua sắm đặc sản và ra sân bay'],
    includes: ['Vé máy bay khứ hồi', 'Resort 4 sao', 'Bữa sáng + 2 bữa chính', 'Cano tham quan đảo'],
    tags: ['Biển', 'Nghỉ dưỡng', 'Hoàng hôn'],
    color: '#93d5ff',
  },
  {
    id: 't3',
    name: 'Nha Trang 3N2Đ - Biển & Lặn ngắm san hô',
    category: 'Biển đảo',
    departure: 'Đà Nẵng',
    date: '25/04/2026',
    duration: '3 ngày 2 đêm',
    groupType: 'Bạn bè',
    seatsLeft: 12,
    price: '3.290.000đ',
    rating: 4.7,
    summary: 'Khám phá vịnh biển, lặn ngắm san hô và vui chơi đảo.',
    itinerary: ['Ngày 1: Tháp Bà Ponagar, chợ đêm', 'Ngày 2: Tour đảo + lặn biển', 'Ngày 3: Tắm bùn khoáng và về'],
    includes: ['Khách sạn 3 sao', 'Ăn sáng', 'Vé cano đảo', 'Bảo hiểm'],
    tags: ['Lặn biển', 'Gia đình', 'Relax'],
    color: '#7fc8ff',
  },
  {
    id: 't4',
    name: 'Sapa 3N2Đ - Mùa lúa chín',
    category: 'Núi rừng',
    departure: 'Hà Nội',
    date: '03/05/2026',
    duration: '3 ngày 2 đêm',
    groupType: 'Nhóm nhỏ',
    seatsLeft: 7,
    price: '3.590.000đ',
    rating: 4.9,
    summary: 'Ruộng bậc thang, bản làng dân tộc và đỉnh Fansipan.',
    itinerary: ['Ngày 1: Bản Cát Cát', 'Ngày 2: Fansipan bằng cáp treo', 'Ngày 3: Chợ Sapa và trở về'],
    includes: ['Xe cabin', 'Khách sạn trung tâm', 'Vé cáp treo', 'Ăn sáng'],
    tags: ['Ruộng bậc thang', 'Văn hóa', 'Trekking nhẹ'],
    color: '#a8b8ff',
  },
  {
    id: 't5',
    name: 'Hội An 2N1Đ - Phố cổ & Đèn lồng',
    category: 'Văn hóa',
    departure: 'TP.HCM',
    date: '06/05/2026',
    duration: '2 ngày 1 đêm',
    groupType: 'Cặp đôi',
    seatsLeft: 10,
    price: '2.190.000đ',
    rating: 4.8,
    summary: 'Trải nghiệm phố cổ, thả đèn hoa đăng và ẩm thực miền Trung.',
    itinerary: ['Ngày 1: Chùa Cầu, phố cổ về đêm', 'Ngày 2: Làng gốm Thanh Hà và về'],
    includes: ['Khách sạn 3 sao', 'Ăn sáng', 'Vé tham quan phố cổ'],
    tags: ['Di sản', 'Ẩm thực', 'Đêm phố cổ'],
    color: '#b5d4ff',
  },
  {
    id: 't6',
    name: 'Huế 2N1Đ - Kinh thành cổ',
    category: 'Văn hóa',
    departure: 'Đà Nẵng',
    date: '09/05/2026',
    duration: '2 ngày 1 đêm',
    groupType: 'Gia đình',
    seatsLeft: 14,
    price: '2.090.000đ',
    rating: 4.7,
    summary: 'Tham quan Đại Nội, lăng tẩm và du thuyền sông Hương.',
    itinerary: ['Ngày 1: Đại Nội, chùa Thiên Mụ', 'Ngày 2: Lăng Khải Định, chợ Đông Ba'],
    includes: ['Xe trung chuyển', 'Khách sạn 3 sao', 'Vé tham quan', 'Hướng dẫn viên'],
    tags: ['Lịch sử', 'Di tích', 'Gia đình'],
    color: '#96c4ff',
  },
  {
    id: 't7',
    name: 'Mũi Né 2N1Đ - Nghỉ dưỡng cuối tuần',
    category: 'Nghỉ dưỡng',
    departure: 'TP.HCM',
    date: '12/05/2026',
    duration: '2 ngày 1 đêm',
    groupType: 'Gia đình',
    seatsLeft: 11,
    price: '1.990.000đ',
    rating: 4.6,
    summary: 'Biển xanh, đồi cát và resort ven biển cho gia đình.',
    itinerary: ['Ngày 1: Bàu Trắng, đồi cát đỏ', 'Ngày 2: Làng chài, thư giãn resort'],
    includes: ['Xe đưa đón', 'Resort 3 sao', 'Ăn sáng'],
    tags: ['Resort', 'Biển', 'Cuối tuần'],
    color: '#8ed9ff',
  },
  {
    id: 't8',
    name: 'Hà Giang 4N3Đ - Cung đường đá',
    category: 'Phiêu lưu',
    departure: 'Hà Nội',
    date: '15/05/2026',
    duration: '4 ngày 3 đêm',
    groupType: 'Bạn bè',
    seatsLeft: 5,
    price: '4.290.000đ',
    rating: 4.9,
    summary: 'Đèo Mã Pí Lèng, sông Nho Quế và bản làng vùng cao.',
    itinerary: ['Ngày 1: Quản Bạ - Yên Minh', 'Ngày 2: Đồng Văn - Mã Pí Lèng', 'Ngày 3: Du thuyền Nho Quế', 'Ngày 4: Về Hà Nội'],
    includes: ['Xe limousine', 'Homestay', 'Vé thuyền', 'Bảo hiểm'],
    tags: ['Phượt', 'Cảnh núi', 'Roadtrip'],
    color: '#8ab4ff',
  },
  {
    id: 't9',
    name: 'Cần Thơ 2N1Đ - Miền Tây sông nước',
    category: 'Gia đình',
    departure: 'TP.HCM',
    date: '17/05/2026',
    duration: '2 ngày 1 đêm',
    groupType: 'Gia đình',
    seatsLeft: 13,
    price: '1.790.000đ',
    rating: 4.6,
    summary: 'Chợ nổi Cái Răng, vườn trái cây và trải nghiệm miền Tây.',
    itinerary: ['Ngày 1: Bến Ninh Kiều, nhà cổ Bình Thủy', 'Ngày 2: Chợ nổi Cái Răng, vườn trái cây'],
    includes: ['Xe du lịch', 'Khách sạn 3 sao', 'Ăn sáng', 'Vé ghe chợ nổi'],
    tags: ['Sông nước', 'Ẩm thực', 'Gia đình'],
    color: '#9fd3ff',
  },
  {
    id: 't10',
    name: 'Quy Nhơn 3N2Đ - Kỳ Co Eo Gió',
    category: 'Biển đảo',
    departure: 'Hà Nội',
    date: '21/05/2026',
    duration: '3 ngày 2 đêm',
    groupType: 'Bạn bè',
    seatsLeft: 8,
    price: '3.690.000đ',
    rating: 4.8,
    summary: 'Biển xanh Quy Nhơn, bãi Kỳ Co và Eo Gió tuyệt đẹp.',
    itinerary: ['Ngày 1: Thành phố Quy Nhơn', 'Ngày 2: Kỳ Co - Eo Gió', 'Ngày 3: Ghềnh Ráng - Tiễn sân bay'],
    includes: ['Vé máy bay', 'Khách sạn 3 sao', 'Cano đảo', 'Ăn sáng'],
    tags: ['Biển', 'Check-in', 'Ảnh đẹp'],
    color: '#86c9ff',
  },
  {
    id: 't11',
    name: 'Bà Nà Hills 2N1Đ - Cầu Vàng',
    category: 'Gia đình',
    departure: 'TP.HCM',
    date: '24/05/2026',
    duration: '2 ngày 1 đêm',
    groupType: 'Gia đình',
    seatsLeft: 15,
    price: '2.590.000đ',
    rating: 4.7,
    summary: 'Tham quan Cầu Vàng, vui chơi công viên và khí hậu mát mẻ.',
    itinerary: ['Ngày 1: Bà Nà Hills, Cầu Vàng', 'Ngày 2: Chợ Hàn, mua đặc sản'],
    includes: ['Vé cáp treo', 'Khách sạn 3 sao', 'Ăn sáng'],
    tags: ['Gia đình', 'Vui chơi', 'Mát mẻ'],
    color: '#a4c8ff',
  },
  {
    id: 't12',
    name: 'Côn Đảo 3N2Đ - Biển và lịch sử',
    category: 'Biển đảo',
    departure: 'TP.HCM',
    date: '28/05/2026',
    duration: '3 ngày 2 đêm',
    groupType: 'Nhóm nhỏ',
    seatsLeft: 4,
    price: '5.290.000đ',
    rating: 4.9,
    summary: 'Kết hợp nghỉ dưỡng biển và khám phá điểm đến lịch sử.',
    itinerary: ['Ngày 1: Bãi Đầm Trầu', 'Ngày 2: Di tích nhà tù Côn Đảo', 'Ngày 3: Chợ địa phương và trở về'],
    includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Ăn sáng', 'Vé tham quan'],
    tags: ['Biển', 'Lịch sử', 'Nghỉ dưỡng'],
    color: '#8fc3ff',
  },
];

export const GUIDES: GuideItem[] = [
  {
    id: 'g1',
    name: 'Trần Minh Khoa',
    location: 'Đà Lạt',
    match: 98,
    rating: 4.9,
    tours: 134,
    experience: '3 năm',
    skills: ['Chụp ảnh', 'Ẩm thực', 'Trekking', 'Tiếng Anh'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '350.000đ',
    fullDayPrice: '650.000đ',
    bio: 'Chuyên tour săn mây và trải nghiệm cà phê đặc sản địa phương.',
    reviews: [
      { user: 'Ngọc Linh', text: 'Nhiệt tình, hỗ trợ chụp ảnh rất có tâm.', stars: 5 },
      { user: 'Minh Tú', text: 'Kiến thức địa phương tốt, lịch trình hợp lý.', stars: 5 },
    ],
    verified: true,
  },
  {
    id: 'g2',
    name: 'Nguyễn Thu Hà',
    location: 'Sapa',
    match: 95,
    rating: 4.8,
    tours: 92,
    experience: '4 năm',
    skills: ['Trekking', 'Văn hóa bản địa', 'Tiếng Anh'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '370.000đ',
    fullDayPrice: '700.000đ',
    bio: 'Dẫn tour cung núi và bản làng, phù hợp nhóm mê thiên nhiên.',
    reviews: [
      { user: 'Đức Huy', text: 'Đi bộ cung ngắn rất vừa sức, view đẹp.', stars: 5 },
      { user: 'Thanh Vy', text: 'Hà thân thiện và đúng giờ.', stars: 5 },
    ],
    verified: true,
  },
  {
    id: 'g3',
    name: 'Lê Quang Dũng',
    location: 'Hội An',
    match: 93,
    rating: 4.8,
    tours: 201,
    experience: '5 năm',
    skills: ['Lịch sử', 'Văn hóa', 'Ẩm thực'],
    languages: ['Việt', 'Anh', 'Trung'],
    halfDayPrice: '360.000đ',
    fullDayPrice: '680.000đ',
    bio: 'Giải thích lịch sử phố cổ và đưa khách trải nghiệm món địa phương.',
    reviews: [
      { user: 'Khánh An', text: 'Kể chuyện lịch sử rất cuốn hút.', stars: 5 },
      { user: 'Hồng Nhung', text: 'Điểm ăn ngon, giá hợp lý.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g4',
    name: 'Phạm Hoài Nam',
    location: 'Nha Trang',
    match: 91,
    rating: 4.7,
    tours: 118,
    experience: '3 năm',
    skills: ['Lặn biển', 'Biển đảo', 'Sơ cứu cơ bản'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '340.000đ',
    fullDayPrice: '640.000đ',
    bio: 'Chuyên tour cano đảo và hoạt động dưới nước an toàn.',
    reviews: [
      { user: 'Anh Thư', text: 'Rất chuyên nghiệp khi đi lặn.', stars: 5 },
      { user: 'Gia Bảo', text: 'Điểm dừng hợp lý cho trẻ em.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g5',
    name: 'Đỗ Trúc Ly',
    location: 'Phú Quốc',
    match: 90,
    rating: 4.7,
    tours: 76,
    experience: '2 năm',
    skills: ['Nghỉ dưỡng', 'Chụp ảnh', 'Lịch trình gia đình'],
    languages: ['Việt', 'Anh', 'Hàn'],
    halfDayPrice: '360.000đ',
    fullDayPrice: '690.000đ',
    bio: 'Phù hợp tour nghỉ dưỡng, hỗ trợ setup lịch nhẹ nhàng.',
    reviews: [
      { user: 'Hải My', text: 'Nói chuyện dễ thương, hỗ trợ tốt.', stars: 5 },
      { user: 'Long Vũ', text: 'Tour rất thư giãn.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g6',
    name: 'Bùi Thanh Sơn',
    location: 'Huế',
    match: 89,
    rating: 4.6,
    tours: 140,
    experience: '6 năm',
    skills: ['Lịch sử', 'Di tích', 'Thuyết minh'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '330.000đ',
    fullDayPrice: '620.000đ',
    bio: 'Thuyết minh chuyên sâu về triều Nguyễn và kiến trúc cung đình.',
    reviews: [
      { user: 'Mai Chi', text: 'Kiến thức rất chắc.', stars: 5 },
      { user: 'Quốc Duy', text: 'Nói chuyện nhẹ nhàng, dễ hiểu.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g7',
    name: 'Ngô Khánh Vân',
    location: 'Quy Nhơn',
    match: 88,
    rating: 4.6,
    tours: 68,
    experience: '2 năm',
    skills: ['Biển đảo', 'Team building', 'Ảnh check-in'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '320.000đ',
    fullDayPrice: '600.000đ',
    bio: 'Năng động, phù hợp nhóm bạn trẻ thích trải nghiệm biển.',
    reviews: [
      { user: 'Yến Nhi', text: 'Nhiệt tình và dễ thương.', stars: 5 },
      { user: 'Hoàng Minh', text: 'Sắp xếp thời gian ổn.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g8',
    name: 'Võ Nhật Hào',
    location: 'Hà Giang',
    match: 87,
    rating: 4.7,
    tours: 84,
    experience: '4 năm',
    skills: ['Roadtrip', 'Địa hình đèo núi', 'An toàn nhóm'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '390.000đ',
    fullDayPrice: '740.000đ',
    bio: 'Chuyên cung đường đèo, quản lý nhịp đoàn và an toàn tốt.',
    reviews: [
      { user: 'Thuỳ Dương', text: 'Đi cung Hà Giang cực đã.', stars: 5 },
      { user: 'Phúc Lâm', text: 'Hướng dẫn kỹ trước khi đi.', stars: 5 },
    ],
    verified: true,
  },
  {
    id: 'g9',
    name: 'Trịnh Mỹ Anh',
    location: 'Cần Thơ',
    match: 86,
    rating: 4.6,
    tours: 57,
    experience: '2 năm',
    skills: ['Ẩm thực miền Tây', 'Chợ nổi', 'Gia đình'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '300.000đ',
    fullDayPrice: '560.000đ',
    bio: 'Dẫn tour miền Tây nhẹ nhàng, phù hợp gia đình có trẻ nhỏ.',
    reviews: [
      { user: 'Bảo Trân', text: 'Giới thiệu món ăn rất ngon.', stars: 5 },
      { user: 'Hữu Phúc', text: 'Lịch trình dễ đi.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g10',
    name: 'Lý Thành Nam',
    location: 'Đà Nẵng',
    match: 85,
    rating: 4.5,
    tours: 110,
    experience: '5 năm',
    skills: ['Gia đình', 'Điểm vui chơi', 'Tiếng Anh'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '310.000đ',
    fullDayPrice: '590.000đ',
    bio: 'Phù hợp tour gia đình, sắp xếp lịch trình không quá dày.',
    reviews: [
      { user: 'Phương Linh', text: 'Đi với bé nhỏ vẫn rất ổn.', stars: 5 },
      { user: 'Tùng Lâm', text: 'Nhiệt tình hỗ trợ.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g11',
    name: 'Nguyễn Gia Bảo',
    location: 'Côn Đảo',
    match: 84,
    rating: 4.6,
    tours: 63,
    experience: '3 năm',
    skills: ['Lịch sử', 'Biển đảo', 'Nghỉ dưỡng'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '340.000đ',
    fullDayPrice: '640.000đ',
    bio: 'Kết hợp tham quan di tích lịch sử và nghỉ dưỡng biển.',
    reviews: [
      { user: 'Yến Vy', text: 'Lịch sử trình bày dễ hiểu.', stars: 5 },
      { user: 'Quang Huy', text: 'Tour chất lượng tốt.', stars: 4 },
    ],
    verified: true,
  },
  {
    id: 'g12',
    name: 'Phan Quỳnh Chi',
    location: 'Mũi Né',
    match: 83,
    rating: 4.5,
    tours: 71,
    experience: '2 năm',
    skills: ['Resort', 'Đồi cát', 'Chụp ảnh cưới'],
    languages: ['Việt', 'Anh'],
    halfDayPrice: '300.000đ',
    fullDayPrice: '580.000đ',
    bio: 'Có thế mạnh lịch trình ngắn cuối tuần và điểm chụp ảnh đẹp.',
    reviews: [
      { user: 'Thảo Nhi', text: 'Gợi ý góc chụp rất đẹp.', stars: 5 },
      { user: 'Hoàng Sơn', text: 'Tư vấn điểm đi phù hợp.', stars: 4 },
    ],
    verified: true,
  },
];

export function getTourById(tourId: string) {
  return TOURS.find((tourItem) => tourItem.id === tourId);
}

export function getGuideById(guideId: string) {
  return GUIDES.find((guideItem) => guideItem.id === guideId);
}
