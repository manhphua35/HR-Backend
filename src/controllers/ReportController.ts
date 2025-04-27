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

    // Tạo báo cáo phòng ban
    async generateDepartmentReport(req: Request, res: Response) {
        try {
            const { departmentId, month, year } = req.body;
            const report = await reportService.generateDepartmentReport(
                parseInt(departmentId),
                parseInt(month),
                parseInt(year)
            );
            res.status(201).json(report);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy báo cáo phòng ban theo khoảng thời gian
    async getDepartmentReports(req: Request, res: Response) {
        try {
            const { departmentId } = req.params;
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ message: "Start date and end date are required" });
            }

            const reports = await reportService.getDepartmentReports(
                parseInt(departmentId),
                new Date(startDate as string),
                new Date(endDate as string)
            );
            res.status(200).json(reports);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Thống kê chi phí nhân sự
    async getHRCostStatistics(req: Request, res: Response) {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ message: "Month and year are required" });
            }

            const statistics = await reportService.getHRCostStatistics(
                parseInt(month as string),
                parseInt(year as string)
            );
            res.status(200).json(statistics);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Lấy dữ liệu tổng hợp cho dashboard
    async getDashboardData(req: Request, res: Response) {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ message: "Month and year are required" });
            }

            const data = await reportService.getDashboardData(
                parseInt(month as string),
                parseInt(year as string)
            );
            res.status(200).json(data);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const reportController = ReportController.getInstance();