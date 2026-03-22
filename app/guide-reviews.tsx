import {
  StyleSheet,
  View
} from "react-native";

const STORAGE_KEY = "@guide_reviews";
interface Review {
  id: string;
  customerName: string;
  tourName: string;
  rating: number;
  comment: string;
  date: string;
  reply: string;
}

const SEED: Review[] = [
  {
    id: "1",
    customerName: "Trần Thị B",
    tourName: "Tour Núi Bà Đen",
    rating: 5,
    comment:
      "Anh hướng dẫn viên rất nhiệt tình, am hiểu địa phương. Chuyến đi rất tuyệt!",
    date: "15/03/2025",
    reply: "",
  },
  {
    id: "2",
    customerName: "Lê Văn C",
    tourName: "Tour Đà Lạt 2N1Đ",
    rating: 4,
    comment:
      "Tour tốt, lịch trình hợp lý. Tuy nhiên xe hơi trễ buổi sáng đầu tiên.",
    date: "10/03/2025",
    reply:
      "Cảm ơn anh C đã phản hồi. Tôi xin lỗi về sự chậm trễ, sẽ cải thiện ở những chuyến sau!",
  },
  {
    id: "3",
    customerName: "Nguyễn Thị D",
    tourName: "Tour Mũi Né biển",
    rating: 5,
    comment:
      "Tuyệt vời! Anh dẫn rất chuyên nghiệp, biết nhiều về lịch sử địa phương.",
    date: "05/03/2025",
    reply: "",
  },
  {
    id: "4",
    customerName: "Phạm Thị G",
    tourName: "Trekking Langbiang",
    rating: 3,
    comment:
      "Tour ổn nhưng thông tin cung cấp trước chưa đầy đủ, tôi không biết cần chuẩn bị gì.",
    date: "01/03/2025",
    reply: "",
  },
];

export default function GuideReviews() {
  // ...logic, state, hooks, etc. giữ nguyên ở trên...
  // Chỉ giữ lại một return duy nhất hợp lệ:
  return (
    <View style={s.container}>
      {/* ...nội dung hợp lệ duy nhất của màn hình reviews ở đây... */}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4ff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1a2f7a" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef9c3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingBadgeTxt: { color: "#d97706", fontWeight: "800", fontSize: 14 },
  content: { padding: 16 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    flexDirection: "row",
    gap: 16,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLeft: { alignItems: "center", width: 80 },
  bigRating: { color: "#1a2f7a", fontSize: 40, fontWeight: "900" },
  starsRow: { flexDirection: "row", gap: 2, marginTop: 4 },
  totalReviews: { color: "#7a8cc2", fontSize: 11, marginTop: 4 },
  summaryRight: { flex: 1, justifyContent: "center", gap: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { color: "#5f73a9", fontSize: 11, fontWeight: "600", width: 28 },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f4ff",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 },
  barCount: { color: "#7a8cc2", fontSize: 11, width: 16, textAlign: "right" },
  filterRow: { gap: 8, paddingBottom: 10 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  resultText: { color: "#7a8cc2", fontSize: 12, marginBottom: 8 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e4ebff",
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  custAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#2856d6",
    alignItems: "center",
    justifyContent: "center",
  },
  custName: { color: "#1a2f7a", fontWeight: "700", fontSize: 14 },
  tourName: { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  starsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  starsNum: { color: "#d97706", fontWeight: "800", fontSize: 13 },
  comment: { color: "#334155", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  replyBox: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: { color: "#2856d6", fontSize: 12, fontWeight: "700" },
  replyTxt: { color: "#5f73a9", fontSize: 12, lineHeight: 18 },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#eaf0ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyBtnTxt: { color: "#2856d6", fontSize: 12, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,18,50,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e4ebff",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  mheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4ff",
  },
  mtitle: { fontSize: 17, fontWeight: "800", color: "#1a2f7a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  mbody: { padding: 20 },
  quoteText: {
    color: "#5f73a9",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4ebff",
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#1a2f7a",
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: "#2856d6",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

const tabSt = StyleSheet.create({
  bar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e8eeff",
    shadowColor: "#2a4caf",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#10b981" },
  label: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  labelActive: { color: "#10b981" },
});
