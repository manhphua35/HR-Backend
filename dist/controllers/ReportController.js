"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = void 0;
const ReportService_1 = require("../services/ReportService");
class ReportController {
    constructor() { }
    static getInstance() {
        if (!ReportController.instance) {
            ReportController.instance = new ReportController();
        }
        return ReportController.instance;
    }
    // Tạo báo cáo cho toàn công ty
    generateCompanyReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { startDate, endDate } = req.body;
                if (!startDate || !endDate) {
                    return res.status(400).json({ success: false, message: "Start date and end date are required" });
                }
                const report = yield ReportService_1.reportService.generateCompanyReport(new Date(startDate), new Date(endDate));
                res.status(201).json({ success: true, data: report });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Lấy báo cáo toàn công ty theo khoảng thời gian
    getCompanyReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { startDate, endDate } = req.query;
                if (!startDate || !endDate) {
                    return res.status(400).json({ success: false, message: "Start date and end date are required" });
                }
                // Sử dụng hàm getDepartmentReports cho toàn công ty sẽ tốt nhất
                // vì báo cáo công ty là tập hợp báo cáo các phòng ban
                const reports = yield ReportService_1.reportService.getDepartmentReports(null, // không filter theo departmentId
                new Date(startDate), new Date(endDate));
                res.status(200).json({ success: true, data: reports });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Tạo báo cáo phòng ban
    generateDepartmentReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { departmentId, startDate, endDate } = req.body;
                if (!departmentId || !startDate || !endDate) {
                    return res.status(400).json({ success: false, message: "Department ID, start date and end date are required" });
                }
                const report = yield ReportService_1.reportService.generateDepartmentReport(parseInt(departmentId), new Date(startDate), new Date(endDate));
                res.status(201).json({ success: true, data: report });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Lấy báo cáo phòng ban theo khoảng thời gian
    getDepartmentReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { departmentId } = req.params;
                const { startDate, endDate } = req.query;
                if (!startDate || !endDate) {
                    return res.status(400).json({ success: false, message: "Start date and end date are required" });
                }
                const reports = yield ReportService_1.reportService.getDepartmentReports(parseInt(departmentId), new Date(startDate), new Date(endDate));
                res.status(200).json({ success: true, data: reports });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Thống kê chi phí nhân sự
    getHRCostStatistics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.query;
                if (!month || !year) {
                    return res.status(400).json({ success: false, message: "Month and year are required" });
                }
                const statistics = yield ReportService_1.reportService.getHRCostStatistics(parseInt(month), parseInt(year));
                res.status(200).json({ success: true, data: statistics });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Lấy dữ liệu tổng hợp cho dashboard
    getDashboardData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.query;
                if (!month || !year) {
                    return res.status(400).json({ success: false, message: "Month and year are required" });
                }
                const data = yield ReportService_1.reportService.getDashboardData(parseInt(month), parseInt(year));
                res.status(200).json({ success: true, data: data });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Lấy dữ liệu dashboard cho nhân viên
    getEmployeeDashboardData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { employeeId } = req.params;
                const { month, year } = req.query;
                if (!employeeId || !month || !year) {
                    return res.status(400).json({
                        success: false,
                        message: "Employee ID, month, and year are required"
                    });
                }
                const data = yield ReportService_1.reportService.getEmployeeDashboardData(parseInt(employeeId), parseInt(month), parseInt(year));
                res.status(200).json({ success: true, data: data });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Lấy dữ liệu dashboard cho trưởng phòng
    getDepartmentManagerDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { departmentId } = req.params;
                const { month, year } = req.query;
                if (!departmentId || !month || !year) {
                    return res.status(400).json({
                        success: false,
                        message: "Department ID, month, and year are required"
                    });
                }
                const data = yield ReportService_1.reportService.getDepartmentManagerDashboard(parseInt(departmentId), parseInt(month), parseInt(year));
                res.status(200).json({ success: true, data });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.reportController = ReportController.getInstance();
