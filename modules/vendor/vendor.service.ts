import { ConflictError } from "../common/error";
import { VendorRepository } from "./vendor.repository";
import { CreateVendorInput, ListVendorsQueryInput, UpdateVendorInput } from "./vendor.schemas";

export class VendorService {
    constructor(private vendorRepository: VendorRepository) { }

    getVendorById = (id: number) => {
        return this.vendorRepository.findById(id);
    }

    createVendor = async (data: CreateVendorInput) => {
        let existingVendor = await this.vendorRepository.findByEmail(data.email);
        if (existingVendor) {
            throw new ConflictError(`Vendor with email ${data.email} already exists`);
        }

        existingVendor = await this.vendorRepository.findByPhone(data.phone);
        if (existingVendor) {
            throw new ConflictError(`Vendor with phone ${data.phone} already exists`);
        }

        return await this.vendorRepository.create(data);
    }

    updateVendor = async (id: number, data: UpdateVendorInput) => {
        const existingVendor = await this.vendorRepository.findById(id);
        if (!existingVendor) {
            throw new ConflictError(`Vendor with ID ${id} does not exist`);
        }

        if (data.email && data.email !== existingVendor.email) {
            const vendorWithEmail = await this.vendorRepository.findByEmail(data.email);
            if (vendorWithEmail) {
                throw new ConflictError(`Vendor with email ${data.email} already exists`);
            }
        }

        if (data.phone && data.phone !== existingVendor.phone) {
            const vendorWithPhone = await this.vendorRepository.findByPhone(data.phone);
            if (vendorWithPhone) {
                throw new ConflictError(`Vendor with phone ${data.phone} already exists`);
            }
        }

        return await this.vendorRepository.update(id, data);
    }

    deleteVendor = async (id: number) => {
        const existingVendor = await this.vendorRepository.findById(id);
        if (!existingVendor) {
            throw new ConflictError(`Vendor with ID ${id} does not exist`);
        }
        return await this.vendorRepository.delete(id);
    }

    listVendors = async (input: ListVendorsQueryInput) => {
        return await this.vendorRepository.list(input);
    }

}