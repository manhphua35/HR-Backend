import { Request, Response } from 'express';
import { reportService } from '../services/ReportService';

class ReportController {
    private static instance: ReportController;

    private constructor() {}

    public static getInstance(): ReportController {
        if (!ReportController.instance) {
            ReportController.instance = new ReportController();
        }
        return ReportController.instance;
    }

    // Tạo báo cáo cho toàn công ty
    async generateCompanyReport(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.body;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: "Start date and end date are required" });
            }

            const report = await reportService.generateCompanyReport(
                new Date(startDate),
                new Date(endDate)
            );
            res.status(201).json({ success: true, data: report });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    
    // Lấy báo cáo toàn công ty theo khoảng thời gian
    async getCompanyReports(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: "Start date and end date are required" });
            }

            // Sử dụng hàm getDepartmentReports cho toàn công ty sẽ tốt nhất
            // vì báo cáo công ty là tập hợp báo cáo các phòng ban
            const reports = await reportService.getDepartmentReports(
                null, // không filter theo departmentId
                new Date(startDate as string),
                new Date(endDate as string)
            );
            res.status(200).json({ success: true, data: reports });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Tạo báo cáo phòng ban
    async generateDepartmentReport(req: Request, res: Response) {
        try {
            const { departmentId, startDate, endDate } = req.body;
            
            if (!departmentId || !startDate || !endDate) {
                return res.status(400).json({ success: false, message: "Department ID, start date and end date are required" });
            }

            const report = await reportService.generateDepartmentReport(
                parseInt(departmentId),
                new Date(startDate),
                new Date(endDate)
            );
            res.status(201).json({ success: true, data: report });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Lấy báo cáo phòng ban theo khoảng thời gian
    async getDepartmentReports(req: Request, res: Response) {
        try {
            const { departmentId } = req.params;
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: "Start date and end date are required" });
            }

            const reports = await reportService.getDepartmentReports(
                parseInt(departmentId),
                new Date(startDate as string),
                new Date(endDate as string)
            );
            res.status(200).json({ success: true, data: reports });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Thống kê chi phí nhân sự
    async getHRCostStatistics(req: Request, res: Response) {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ success: false, message: "Month and year are required" });
            }

            const statistics = await reportService.getHRCostStatistics(
                parseInt(month as string),
                parseInt(year as string)
            );
            res.status(200).json({ success: true, data: statistics });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Lấy dữ liệu tổng hợp cho dashboard
    async getDashboardData(req: Request, res: Response) {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ success: false, message: "Month and year are required" });
            }

            const data = await reportService.getDashboardData(
                parseInt(month as string),
                parseInt(year as string)
            );
            res.status(200).json({ success: true, data: data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    
    // Lấy dữ liệu dashboard cho nhân viên
    async getEmployeeDashboardData(req: Request, res: Response) {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;
            
            if (!employeeId || !month || !year) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Employee ID, month, and year are required" 
                });
            }

            const data = await reportService.getEmployeeDashboardData(
                parseInt(employeeId),
                parseInt(month as string),
                parseInt(year as string)
            );
            res.status(200).json({ success: true, data: data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Lấy dữ liệu dashboard cho trưởng phòng
    async getDepartmentManagerDashboard(req: Request, res: Response) {
        try {
            const { departmentId } = req.params;
            const { month, year } = req.query;
            
            if (!departmentId || !month || !year) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Department ID, month, and year are required" 
                });
            }

            const data = await reportService.getDepartmentManagerDashboard(
                parseInt(departmentId),
                parseInt(month as string),
                parseInt(year as string)
            );
            
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export const reportController = ReportController.getInstance();