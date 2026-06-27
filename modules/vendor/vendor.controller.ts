import { Response } from "express";
import { AuthenticatedAdminRequest } from "../../types";
import { VendorService } from "./vendor.service";
import { handleError } from "../../utils/error-handler";
import { createVendorSchema, listVendorsQuerySchema, updateVendorSchema } from "./vendor.schemas";

export class VendorController {
    constructor(private vendorService: VendorService) { }

    getVendorById = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const vendor = await this.vendorService.getVendorById(Number(req.params.vendorId));
            res.status(200).json({
                message: "Vendor retrieved successfully",
                data: { vendor }
            });
        } catch (error) {
            handleError(error, res, "Vendor retrieval error:");
        }
    }

    createVendor = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createVendorSchema.parse(req.body);
            const vendor = await this.vendorService.createVendor(input);
            res.status(201).json({
                message: "Vendor created successfully",
                data: { vendor }
            });
        } catch (error) {
            handleError(error, res, "Vendor creation error:");
        }
    }

    updateVendor = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = updateVendorSchema.parse(req.body);
            const vendor = await this.vendorService.updateVendor(Number(req.params.vendorId), input);
            res.status(200).json({
                message: "Vendor updated successfully",
                data: { vendor }
            });
        } catch (error) {
            handleError(error, res, "Vendor update error:");
        }
    }

    deleteVendor = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            await this.vendorService.deleteVendor(Number(req.params.vendorId));
            res.status(200).json({
                message: "Vendor deleted successfully"
            });
        } catch (error) {
            handleError(error, res, "Vendor deletion error:");
        }
    }

    listVendors = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listVendorsQuerySchema.parse(req.query);
            const vendors = await this.vendorService.listVendors(input);
            res.status(200).json({
                message: "Vendors retrieved successfully",
                data: { vendors }
            });
        } catch (error) {
            handleError(error, res, "Vendor listing error:");
        }
    }

}