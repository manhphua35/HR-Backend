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
exports.payrollService = void 0;
const data_source_1 = require("../config/data-source");
const Payroll_1 = require("../entities/payroll/Payroll");
const User_1 = require("../entities/core/User");
const Leave_1 = require("../entities/leave/Leave");
const Attendance_1 = require("../entities/attendance/Attendance");
const Role_1 = require("../entities/auth/Role");
const typeorm_1 = require("typeorm");
class PayrollService {
    constructor() {
        this.payrollRepo = data_source_1.AppDataSource.getRepository(Payroll_1.Payroll);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.leaveRepo = data_source_1.AppDataSource.getRepository(Leave_1.Leave);
        this.attendanceRepo = data_source_1.AppDataSource.getRepository(Attendance_1.Attendance);
    }
    static getInstance() {
        if (!PayrollService.instance) {
            PayrollService.instance = new PayrollService();
        }
        return PayrollService.instance;
    }
    _calculateNetSalaryForUser(user, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            let existingPayroll = yield this.payrollRepo.findOne({
                where: { user: { id: user.id }, month, year }
            });
            let baseSalaryForCalc;
            let bonusForCalc = 0;
            let allowanceForCalc = 0;
            let benefitForCalc = 0;
            let otherDeductionsPreserved = 0;
            if (existingPayroll) {
                baseSalaryForCalc = parseFloat(String(existingPayroll.baseSalary)) || 0;
                bonusForCalc = parseFloat(String(existingPayroll.bonus)) || 0;
                allowanceForCalc = parseFloat(String(existingPayroll.totalAllowance)) || 0;
                benefitForCalc = parseFloat(String(existingPayroll.totalBenefit)) || 0;
                const prevTotalDeduction = parseFloat(String(existingPayroll.totalDeduction)) || 0;
                const prevLeaveDeduction = parseFloat(String(existingPayroll.leaveDeductionAmount)) || 0;
                const prevLatePenalty = parseFloat(String(existingPayroll.latePenaltyAmount)) || 0;
                otherDeductionsPreserved = Math.max(0, prevTotalDeduction - prevLeaveDeduction - prevLatePenalty);
            }
            else {
                // Cho phép baseSalary của user là 0
                if (user.baseSalary === null || typeof user.baseSalary === 'undefined') {
                    console.warn(`User ${user.id} - ${user.fullName} does not have a base salary defined. Creating zero-value payroll record.`);
                    const zeroPayroll = new Payroll_1.Payroll();
                    zeroPayroll.user = user;
                    zeroPayroll.userId = user.id;
                    zeroPayroll.month = month;
                    zeroPayroll.year = year;
                    zeroPayroll.baseSalary = 0;
                    zeroPayroll.totalAllowance = 0;
                    zeroPayroll.totalDeduction = 0;
                    zeroPayroll.totalBenefit = 0;
                    zeroPayroll.netSalary = 0;
                    zeroPayroll.leaveDeductionAmount = 0;
                    zeroPayroll.latePenaltyAmount = 0;
                    zeroPayroll.bonus = 0;
                    zeroPayroll.tax = 0;
                    zeroPayroll.isFinalized = false;
                    return yield this.payrollRepo.save(zeroPayroll);
                }
                baseSalaryForCalc = parseFloat(String(user.baseSalary)) || 0;
            }
            // --- Recalculate dynamic components ---
            let leaveDeductionAmount = 0;
            let latePenaltyAmount = 0;
            const payrollMonthStartDate = new Date(year, month - 1, 1);
            const payrollMonthEndDate = new Date(year, month, 0);
            const approvedLeavesOverlappingMonth = yield this.leaveRepo.find({
                where: {
                    user: { id: user.id },
                    status: Leave_1.LeaveStatus.APPROVED,
                    startDate: (0, typeorm_1.LessThanOrEqual)(payrollMonthEndDate),
                    endDate: (0, typeorm_1.MoreThanOrEqual)(payrollMonthStartDate)
                }
            });
            let calculatedLeaveDaysInMonth = 0;
            for (const leave of approvedLeavesOverlappingMonth) {
                const effectiveLeaveStart = leave.startDate > payrollMonthStartDate ? leave.startDate : payrollMonthStartDate;
                const effectiveLeaveEnd = leave.endDate < payrollMonthEndDate ? leave.endDate : payrollMonthEndDate;
                if (effectiveLeaveStart <= effectiveLeaveEnd) {
                    const diffTime = Math.abs(effectiveLeaveEnd.getTime() - effectiveLeaveStart.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    calculatedLeaveDaysInMonth += diffDays;
                }
            }
            leaveDeductionAmount = calculatedLeaveDaysInMonth * 0.03 * baseSalaryForCalc;
            const monthStartDateString = payrollMonthStartDate.toISOString().split('T')[0];
            const monthEndDateString = payrollMonthEndDate.toISOString().split('T')[0];
            const lateArrivals = yield this.attendanceRepo.count({
                where: {
                    user: { id: user.id },
                    date: (0, typeorm_1.Between)(monthStartDateString, monthEndDateString),
                    status: Attendance_1.AttendanceStatus.LATE
                }
            });
            latePenaltyAmount = lateArrivals * 100000;
            const finalTotalDeduction = leaveDeductionAmount + latePenaltyAmount + otherDeductionsPreserved;
            const incomeBeforeTax = (baseSalaryForCalc + bonusForCalc + allowanceForCalc + benefitForCalc) - finalTotalDeduction;
            const tax = Math.max(0, incomeBeforeTax * 0.1);
            const netSalary = incomeBeforeTax - tax;
            let payrollToSave;
            if (existingPayroll) {
                payrollToSave = existingPayroll;
            }
            else {
                payrollToSave = new Payroll_1.Payroll();
                payrollToSave.user = user;
                payrollToSave.userId = user.id;
                payrollToSave.month = month;
                payrollToSave.year = year;
            }
            payrollToSave.baseSalary = parseFloat(baseSalaryForCalc.toFixed(2));
            payrollToSave.totalAllowance = parseFloat(allowanceForCalc.toFixed(2));
            payrollToSave.totalDeduction = parseFloat(finalTotalDeduction.toFixed(2));
            payrollToSave.totalBenefit = parseFloat(benefitForCalc.toFixed(2));
            payrollToSave.leaveDeductionAmount = parseFloat(leaveDeductionAmount.toFixed(2));
            payrollToSave.latePenaltyAmount = parseFloat(latePenaltyAmount.toFixed(2));
            payrollToSave.bonus = parseFloat(bonusForCalc.toFixed(2));
            payrollToSave.tax = parseFloat(tax.toFixed(2));
            payrollToSave.netSalary = parseFloat(netSalary.toFixed(2));
            if (existingPayroll) {
                payrollToSave.isFinalized = existingPayroll.isFinalized;
            }
            else {
                payrollToSave.isFinalized = false;
            }
            return yield this.payrollRepo.save(payrollToSave);
        });
    }
    processBatchPayrollCalculation(requestingUser, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let usersToProcess = [];
                if (!requestingUser.role || !requestingUser.role.roleType) {
                    throw new Error("Requesting user's role or role type is undefined.");
                }
                const userRoleType = requestingUser.role.roleType;
                if (userRoleType === Role_1.RoleType.SYSTEM_ADMIN || userRoleType === Role_1.RoleType.HR_STAFF) {
                    usersToProcess = yield this.userRepo.find({
                        relations: ["department", "position", "role"]
                    });
                }
                else if (userRoleType === Role_1.RoleType.DEPARTMENT_HEAD) {
                    if (!requestingUser.departmentId) {
                        throw new Error("Department head does not have an assigned department.");
                    }
                    usersToProcess = yield this.userRepo.find({
                        where: { departmentId: requestingUser.departmentId },
                        relations: ["department", "position", "role"]
                    });
                }
                else {
                    throw new Error("User does not have permission to process batch payroll.");
                }
                if (usersToProcess.length === 0) {
                    console.log("No users found to process payroll for.");
                    return [];
                }
                const payrollResults = [];
                for (const user of usersToProcess) {
                    try {
                        const payroll = yield this._calculateNetSalaryForUser(user, month, year);
                        // Đảm bảo thông tin nhân viên được gắn vào kết quả
                        payroll.user = user;
                        // Thêm ghi chú có chứa tên nhân viên
                        if (!payroll.note) {
                            payroll.note = `Payroll for ${user.fullName}`;
                        }
                        else {
                            payroll.note = `${payroll.note} - ${user.fullName}`;
                        }
                        payrollResults.push(payroll);
                    }
                    catch (error) {
                        console.error(`Failed to calculate payroll for user ${user.id} (${user.fullName}): ${error.message}`);
                    }
                }
                return payrollResults;
            }
            catch (error) {
                console.error("Error during batch payroll calculation:", error);
                throw error;
            }
        });
    }
    // Lấy danh sách lương theo tháng hoặc theo phòng ban
    getPayrolls(month, year, departmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queryBuilder = this.payrollRepo
                    .createQueryBuilder("payroll")
                    .leftJoinAndSelect("payroll.user", "user")
                    .leftJoinAndSelect("user.position", "position")
                    .leftJoinAndSelect("user.department", "department")
                    .where("payroll.month = :month", { month })
                    .andWhere("payroll.year = :year", { year });
                if (departmentId) {
                    queryBuilder.andWhere("user.departmentId = :departmentId", { departmentId });
                }
                // Chọn thêm các trường cần thiết
                queryBuilder.addSelect([
                    "user.fullName",
                    "user.email",
                    "user.employeeId"
                ]);
                return yield queryBuilder
                    .orderBy("department.name", "ASC")
                    .addOrderBy("user.fullName", "ASC")
                    .getMany();
            }
            catch (error) {
                throw error;
            }
        });
    }
    // Lấy chi tiết bảng lương của một nhân viên
    getPayrollDetail(userId, month, year) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Searching payroll for user ${userId} in ${month}/${year}`);
                // Sử dụng queryBuilder để chọn thêm các trường cần thiết
                const payroll = yield this.payrollRepo
                    .createQueryBuilder("payroll")
                    .leftJoinAndSelect("payroll.user", "user")
                    .leftJoinAndSelect("user.position", "position")
                    .leftJoinAndSelect("user.department", "department")
                    .where("user.id = :userId", { userId })
                    .andWhere("payroll.month = :month", { month })
                    .andWhere("payroll.year = :year", { year })
                    .addSelect([
                    "user.fullName",
                    "user.email",
                    "user.employeeId"
                ])
                    .getOne();
                console.log('Result:', payroll);
                if (!payroll) {
                    return null;
                }
                return payroll;
            }
            catch (error) {
                console.error(`Error fetching payroll detail for user ${userId}:`, error);
                throw error;
            }
        });
    }
    // Hoàn tất bảng lương
    finalizePayroll(payrollId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!payroll) {
                    throw new Error("Payroll not found");
                }
                payroll.isFinalized = true;
                yield this.payrollRepo.save(payroll);
            }
            catch (error) {
                throw error;
            }
        });
    }
    // Lấy lịch sử thay đổi lương
    getPayrollHistory(payrollId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!payroll) {
                    throw new Error("Payroll not found");
                }
                return payroll.updateHistory || [];
            }
            catch (error) {
                console.error("Error getting payroll history:", error);
                throw error;
            }
        });
    }
    // Xóa một mục trong lịch sử thay đổi lương
    deletePayrollHistoryEntry(payrollId, entryTimestamp, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!payroll) {
                    throw new Error("Payroll not found");
                }
                if (!payroll.updateHistory || payroll.updateHistory.length === 0) {
                    throw new Error("Không có lịch sử thay đổi để xóa");
                }
                // Tìm vị trí của entry cần xóa
                const entryIndex = payroll.updateHistory.findIndex(entry => entry.timestamp === entryTimestamp);
                if (entryIndex === -1) {
                    throw new Error("Không tìm thấy mục lịch sử cần xóa");
                }
                const entryToDelete = payroll.updateHistory[entryIndex];
                // Xóa entry khỏi lịch sử
                payroll.updateHistory.splice(entryIndex, 1);
                // Xử lý cập nhật note chính của payroll nếu mục xóa có note
                if (entryToDelete.note && payroll.note) {
                    // Tìm và xóa note tương ứng nếu có trong note chính
                    const noteToRemove = entryToDelete.note;
                    const updatedNote = payroll.note
                        .replace(`; ${noteToRemove}`, '') // Xóa nếu nằm ở giữa
                        .replace(`${noteToRemove}; `, '') // Xóa nếu nằm ở đầu
                        .replace(noteToRemove, ''); // Xóa nếu chỉ có một mục
                    payroll.note = updatedNote.trim();
                }
                // Cập nhật các giá trị liên quan
                if (entryToDelete.changes) {
                    // Kiểm tra nếu entry chứa cập nhật về bonus hoặc deduction
                    const bonusChange = entryToDelete.changes.find(c => c.field === 'bonus');
                    const deductionChange = entryToDelete.changes.find(c => c.field === 'totalDeduction');
                    if (bonusChange) {
                        // Nếu là thay đổi bonus, khôi phục giá trị cũ
                        payroll.bonus = parseFloat(String(bonusChange.oldValue)) || 0;
                    }
                    if (deductionChange) {
                        // Nếu là thay đổi khấu trừ, khôi phục giá trị cũ
                        payroll.totalDeduction = parseFloat(String(deductionChange.oldValue)) || 0;
                    }
                    // Tính toán lại lương thực nhận nếu có sự thay đổi
                    if (bonusChange || deductionChange) {
                        const netSalary = (parseFloat(String(payroll.baseSalary)) +
                            parseFloat(String(payroll.bonus)) +
                            parseFloat(String(payroll.totalAllowance)) +
                            parseFloat(String(payroll.totalBenefit)) -
                            parseFloat(String(payroll.totalDeduction)) -
                            parseFloat(String(payroll.tax)));
                        payroll.netSalary = parseFloat(netSalary.toFixed(2));
                    }
                }
                yield this.payrollRepo.save(payroll);
                return payroll;
            }
            catch (error) {
                console.error("Error deleting payroll history entry:", error);
                throw error;
            }
        });
    }
    // Thêm phương thức cập nhật lương
    updatePayroll(payrollId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // console.log(`[PayrollService] updatePayroll for ID: ${payrollId} - Received data:`, JSON.stringify(updateData));
                const payroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!payroll) {
                    throw new Error("Payroll not found");
                }
                // Khởi tạo mảng lịch sử nếu chưa có
                if (!payroll.updateHistory) {
                    payroll.updateHistory = [];
                }
                const historyChanges = [];
                let reasonForUpdate = undefined;
                let historyNote = undefined;
                // Lưu trữ trạng thái ban đầu của các trường có thể thay đổi
                const initialPayrollState = {
                    baseSalary: parseFloat(String(payroll.baseSalary)) || 0,
                    bonus: parseFloat(String(payroll.bonus)) || 0,
                    totalAllowance: parseFloat(String(payroll.totalAllowance)) || 0,
                    totalBenefit: parseFloat(String(payroll.totalBenefit)) || 0,
                    tax: parseFloat(String(payroll.tax)) || 0,
                    totalDeduction: parseFloat(String(payroll.totalDeduction)) || 0,
                    note: (_a = payroll.note) !== null && _a !== void 0 ? _a : null, // Đảm bảo note là null nếu nó là undefined/null
                    netSalary: (payroll.netSalary === null || payroll.netSalary === undefined) ? null : (parseFloat(String(payroll.netSalary)) || 0),
                };
                // Các biến làm việc cho việc tính toán, khởi tạo từ giá trị hiện tại (sau này sẽ được cập nhật nếu có trong updateData)
                let currentBaseSalary = initialPayrollState.baseSalary;
                let currentBonus = initialPayrollState.bonus;
                let currentTotalAllowance = initialPayrollState.totalAllowance;
                let currentTotalBenefit = initialPayrollState.totalBenefit;
                let currentTax = initialPayrollState.tax;
                let currentTotalDeduction = initialPayrollState.totalDeduction;
                // Xử lý cập nhật và ghi nhận thay đổi vào historyChanges
                if (updateData.baseSalary !== undefined && updateData.baseSalary !== null) {
                    const newValue = parseFloat(String(updateData.baseSalary)) || 0;
                    if (initialPayrollState.baseSalary !== newValue) {
                        historyChanges.push({ field: 'baseSalary', oldValue: initialPayrollState.baseSalary, newValue: newValue });
                    }
                    payroll.baseSalary = newValue;
                    currentBaseSalary = newValue;
                    reasonForUpdate = "Cập nhật lương cơ bản";
                }
                // Cập nhật theo loại thành phần lương (nếu có chỉ định)
                if (updateData.componentType && updateData.bonus !== undefined && updateData.bonus !== null) {
                    const amount = parseFloat(String(updateData.bonus)) || 0;
                    let fieldToUpdate = '';
                    let currentValue = 0;
                    switch (updateData.componentType) {
                        case Payroll_1.ComponentType.ALLOWANCE:
                            fieldToUpdate = 'totalAllowance';
                            currentValue = initialPayrollState.totalAllowance;
                            reasonForUpdate = "Cập nhật phụ cấp";
                            break;
                        case Payroll_1.ComponentType.BENEFIT:
                            fieldToUpdate = 'totalBenefit';
                            currentValue = initialPayrollState.totalBenefit;
                            reasonForUpdate = "Cập nhật phúc lợi";
                            break;
                        case Payroll_1.ComponentType.DEDUCTION:
                            fieldToUpdate = 'totalDeduction';
                            currentValue = initialPayrollState.totalDeduction;
                            reasonForUpdate = "Cập nhật khấu trừ";
                            break;
                        default:
                            fieldToUpdate = 'bonus';
                            currentValue = initialPayrollState.bonus;
                            reasonForUpdate = "Cập nhật thưởng";
                    }
                    let newValue;
                    if (updateData.shouldAdd) {
                        // Cộng dồn vào giá trị hiện tại
                        newValue = currentValue + amount;
                    }
                    else {
                        // Thay thế giá trị hiện tại
                        newValue = amount;
                    }
                    // Ghi nhận thay đổi vào lịch sử
                    if (currentValue !== newValue) {
                        historyChanges.push({ field: fieldToUpdate, oldValue: currentValue, newValue: newValue });
                    }
                    // Cập nhật giá trị tương ứng
                    switch (fieldToUpdate) {
                        case 'totalAllowance':
                            payroll.totalAllowance = parseFloat(newValue.toFixed(2));
                            currentTotalAllowance = payroll.totalAllowance;
                            break;
                        case 'totalBenefit':
                            payroll.totalBenefit = parseFloat(newValue.toFixed(2));
                            currentTotalBenefit = payroll.totalBenefit;
                            break;
                        case 'totalDeduction':
                            payroll.totalDeduction = parseFloat(newValue.toFixed(2));
                            currentTotalDeduction = payroll.totalDeduction;
                            break;
                        case 'bonus':
                            payroll.bonus = parseFloat(newValue.toFixed(2));
                            currentBonus = payroll.bonus;
                            break;
                    }
                }
                else {
                    // Xử lý cách cũ nếu không có componentType
                    if (updateData.bonus !== undefined && updateData.bonus !== null) {
                        let newValue;
                        if (updateData.shouldAdd) {
                            // Cộng dồn nếu có flag shouldAdd
                            newValue = initialPayrollState.bonus + (parseFloat(String(updateData.bonus)) || 0);
                        }
                        else {
                            // Thay thế nếu không có flag
                            newValue = parseFloat(String(updateData.bonus)) || 0;
                        }
                        if (initialPayrollState.bonus !== newValue) {
                            historyChanges.push({ field: 'bonus', oldValue: initialPayrollState.bonus, newValue: newValue });
                        }
                        payroll.bonus = newValue;
                        currentBonus = newValue;
                        if (!reasonForUpdate)
                            reasonForUpdate = "Cập nhật thưởng";
                    }
                    if (updateData.totalAllowance !== undefined && updateData.totalAllowance !== null) {
                        let newValue;
                        if (updateData.shouldAdd) {
                            newValue = initialPayrollState.totalAllowance + (parseFloat(String(updateData.totalAllowance)) || 0);
                        }
                        else {
                            newValue = parseFloat(String(updateData.totalAllowance)) || 0;
                        }
                        if (initialPayrollState.totalAllowance !== newValue) {
                            historyChanges.push({ field: 'totalAllowance', oldValue: initialPayrollState.totalAllowance, newValue: newValue });
                        }
                        payroll.totalAllowance = newValue;
                        currentTotalAllowance = newValue;
                        if (!reasonForUpdate)
                            reasonForUpdate = "Cập nhật phụ cấp";
                    }
                    if (updateData.totalBenefit !== undefined && updateData.totalBenefit !== null) {
                        let newValue;
                        if (updateData.shouldAdd) {
                            newValue = initialPayrollState.totalBenefit + (parseFloat(String(updateData.totalBenefit)) || 0);
                        }
                        else {
                            newValue = parseFloat(String(updateData.totalBenefit)) || 0;
                        }
                        if (initialPayrollState.totalBenefit !== newValue) {
                            historyChanges.push({ field: 'totalBenefit', oldValue: initialPayrollState.totalBenefit, newValue: newValue });
                        }
                        payroll.totalBenefit = newValue;
                        currentTotalBenefit = newValue;
                        if (!reasonForUpdate)
                            reasonForUpdate = "Cập nhật phúc lợi";
                    }
                }
                if (updateData.tax !== undefined && updateData.tax !== null) {
                    const newValue = parseFloat(String(updateData.tax)) || 0;
                    if (initialPayrollState.tax !== newValue) {
                        historyChanges.push({ field: 'tax', oldValue: initialPayrollState.tax, newValue: newValue });
                    }
                    payroll.tax = newValue;
                    currentTax = newValue;
                    if (!reasonForUpdate)
                        reasonForUpdate = "Cập nhật thuế";
                }
                const newDeductionAmount = parseFloat(String(updateData.deductionAmount)) || 0;
                if (updateData.deductionAmount !== undefined && newDeductionAmount >= 0) {
                    const newTotalDeduction = initialPayrollState.totalDeduction + newDeductionAmount;
                    if (initialPayrollState.totalDeduction !== newTotalDeduction) {
                        historyChanges.push({ field: 'totalDeduction', oldValue: initialPayrollState.totalDeduction, newValue: newTotalDeduction });
                    }
                    payroll.totalDeduction = parseFloat(newTotalDeduction.toFixed(2));
                    currentTotalDeduction = payroll.totalDeduction;
                    if (updateData.deductionNote) {
                        // Lưu giữ note riêng vào lịch sử thay đổi thay vì gộp vào trường note chính
                        historyNote = `Khấu trừ: ${updateData.deductionNote}`;
                        reasonForUpdate = historyNote;
                        // Vẫn cập nhật note chính nhưng dưới dạng thêm vào, không ghi đè
                        const newNoteValue = initialPayrollState.note
                            ? `${initialPayrollState.note}; ${historyNote}`
                            : historyNote;
                        if (initialPayrollState.note !== newNoteValue) {
                            historyChanges.push({
                                field: 'note',
                                oldValue: initialPayrollState.note,
                                newValue: newNoteValue
                            });
                        }
                        payroll.note = newNoteValue;
                    }
                }
                else if (updateData.note !== undefined && updateData.deductionAmount === undefined) {
                    // Lưu note mới vào history thay vì gộp
                    historyNote = updateData.note;
                    if (initialPayrollState.note !== updateData.note) {
                        historyChanges.push({ field: 'note', oldValue: initialPayrollState.note, newValue: updateData.note });
                    }
                    payroll.note = updateData.note;
                    if (!reasonForUpdate)
                        reasonForUpdate = `Cập nhật ghi chú`;
                }
                else if (!updateData.deductionNote && updateData.deductionAmount === undefined) {
                    // Giữ lại note cũ nếu không có note mới được cung cấp và không phải là trường hợp khấu trừ
                    payroll.note = initialPayrollState.note;
                }
                // Tính toán lại lương thực nhận sau khi tất cả các cập nhật khác đã được áp dụng
                const netSalaryNumber = currentBaseSalary + currentBonus + currentTotalAllowance + currentTotalBenefit - currentTotalDeduction - currentTax;
                const finalNewNetSalary = parseFloat(netSalaryNumber.toFixed(2));
                if (initialPayrollState.netSalary !== finalNewNetSalary) {
                    historyChanges.push({ field: 'netSalary', oldValue: initialPayrollState.netSalary, newValue: finalNewNetSalary });
                }
                payroll.netSalary = finalNewNetSalary;
                // Thêm vào lịch sử nếu có thay đổi
                if (historyChanges.length > 0) {
                    payroll.updateHistory.push({
                        timestamp: new Date().toISOString(),
                        updatedBy: updateData.updatedBy, // Sử dụng ID người dùng từ request
                        changes: historyChanges,
                        reason: reasonForUpdate,
                        note: historyNote // Thêm trường note vào lịch sử
                    });
                }
                yield this.payrollRepo.save(payroll);
                const updatedPayroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!updatedPayroll) {
                    console.log(`[PayrollService] Failed to retrieve payroll with ID: ${payrollId} after update call.`);
                    throw new Error("Failed to retrieve payroll after update");
                }
                return updatedPayroll;
            }
            catch (error) {
                console.log("[PayrollService] Error in updatePayroll:", error);
                throw error;
            }
        });
    }
    // Thêm phương thức thiết lập ngày thanh toán
    setPaymentDate(payrollId, paymentDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payroll = yield this.payrollRepo.findOneBy({ id: payrollId });
                if (!payroll) {
                    throw new Error("Payroll not found");
                }
                payroll.paymentDate = paymentDate;
                return yield this.payrollRepo.save(payroll);
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.payrollService = PayrollService.getInstance();
