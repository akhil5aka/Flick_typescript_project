// Implimented by Akhil
import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../../../util/database_connection"; // Importing Prisma client

import { writeSuccessMessage, writeValidationErrorMessage } from "../../../util/Output_message";


const SANDBOX_BASE_URL = {
  name: "SANDBOX",
  url: "https://sandbox-my.flick.network/",
};

export class Endpoints {
  private api: AxiosInstance;
  static instance: Endpoints;

  static getInstance(): Endpoints {
    if (!Endpoints.instance) {
      Endpoints.instance = new Endpoints();
    }
    return Endpoints.instance;
  } 

  private constructor() {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("API_KEY is missing in the .env file");
    }

    this.api = axios.create({
      baseURL: SANDBOX_BASE_URL.url,
      headers: {
        "Content-Type": "application/json",
        "x-flick-auth-key": apiKey,
      },
    });

    console.log("Starting in", SANDBOX_BASE_URL.name, "mode");
  }

  async NormalReportDocuments(documents: any, supplierUUID: string) {
    try {
      console.log("Documents:", documents);
      console.log("Supplier UUID:", supplierUUID);
      delete documents.CoCode
      delete documents.mode

      // Axios POST request
      const response = await this.api.post(
        "/api/einvoice/generate/invoice",
        documents,
        {
          headers: {
            supplier_uuid: supplierUUID,
          },
        }
      );

      console.log("Response Data:", response.data.data.errors);
      // process.exit(0)

      // Extract response data
      const submissionResponse = response.data.data.submissionResponse;
      const uuid = submissionResponse.acceptedDocuments[0]?.uuid || "";
      const submissionUid = submissionResponse.submissionUid || "";
      const invoiceNumber =
        submissionResponse.acceptedDocuments[0]?.invoiceCodeNumber || "";
      const invoiceStatus = response.data.status || "";

      // Database operation
      try {
        const existingRecord = await prisma.tb_invoice.findMany({
          where: { uuid },
          select: { invoice_number: true, id: true },
        });

        if (existingRecord.length === 0) {
          writeSuccessMessage(invoiceNumber, "",uuid,invoiceStatus);

          const newRecord = await prisma.tb_invoice.create({
            data: {
              invoice_number: invoiceNumber,
              uuid,
              status: invoiceStatus,
              submissionuid: submissionUid,
            },
          });

          console.log("New record inserted successfully:", newRecord);
        } else {
          console.log("Record already exists for UUID:", uuid);
        }
      } catch (dbError: any) {
        console.error("Database operation error:", dbError);
        if (dbError.code === "P2002") {
          console.error("Unique constraint violation:", dbError.meta?.target);
        }
      }

      return response.data;
    } catch (error: any) {
      console.error(
        "Error in NormalReportDocuments:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async GetStatus(documents: { uuid: string }, supplierUUID: string) {
    try {
      const uuid = documents.uuid;
      let errorReason = "";

      const response = await this.api.get(
        `/api/einvoice/get-document/${uuid}`,
        {
          headers: {
            supplier_uuid: supplierUUID,
          },
        }
      );

      console.log("Response of GetStatus:", response.data);

      const status = response.data.status;

      // Handle invalid status
      if (status === "Invalid") {
        const validationSteps =
          response.data.validationResults?.validationSteps || [];
        validationSteps.forEach((step: any) => {
          if (step.status === "Invalid" && step.error?.error) {
            errorReason = step.error.error;
            console.log("Reason for invalid:", errorReason);
          }
        });
      } else if (status === "Cancelled") {
        errorReason = response.data.documentStatusReason;
      }

      try {
        const longId = response.data.longId;

        // Update database
        const updatedUser = await prisma.tb_invoice.update({
          where: { uuid },
          data: {
            status,
            longid: longId,
            doc_reasson: errorReason,
          },
        });

        console.log("Updated user in database:", updatedUser);
      } catch (dbError) {
        console.error("Error updating user in database:", dbError);
      } finally {
        await prisma.$disconnect();
      }
    } catch (apiError: any) {
      console.error(
        "Error in GetStatus:",
        apiError.response?.data || apiError.message
      );
    }
  }

  //cancel invoice  logic start here

  async Cancel_invoice(uuid: string, reason: string, supplierUUID: string) {
    try {
      const cancel_data = {
        uuid: uuid,     
        status: 'cancelled',      
        reason: reason,   
      };
  
      const response = await this.api.post(
        "/api/einvoice/cancel",
        cancel_data,
        {
          headers: {
            supplier_uuid: supplierUUID,
          },
        }
      );
  
      
      const invoiceNumber = response.data?.document_id_sap || uuid; 
      const qrString = response.data?.qr_value || ""; 
     
      var status="Cancelled"
  
      await writeSuccessMessage(invoiceNumber, qrString, uuid, "cancelled");


      //db updation

      try {
        const longId = response.data.longId;

        // Update database
        const updatedUser = await prisma.tb_invoice.update({
          where: { uuid },
          data: {
            status,
            longid: longId,
            doc_reasson: reason,
          },
        });

        console.log("Updated user in database:", updatedUser);
      } catch (dbError) {
        console.error("Error updating user in database:", dbError);
      } finally {
        await prisma.$disconnect();
      }

  
      console.log("Cancellation was successful. Written to file.");
    } catch (err: any) {
      
      const invoiceNumber = uuid; 
      const errorMessage = err.response?.data?.error || err.message;
  console.log(errorMessage,"error message")
      writeValidationErrorMessage(invoiceNumber, errorMessage);
  
      console.error("Cancellation failed. Error written to file.");
    }
  }


  //selfbilled logic start here
  async SelfBilled(documents:any,supplierUUID:string)
  {
    try
    {

      try {
        console.log("Documents:", documents);
        console.log("Supplier UUID:", supplierUUID);
        delete documents.CoCode
        delete documents.mode
  
        // Axios POST request
        const response = await this.api.post(
          "/api/einvoice/generate/self-billed-invoice",
          documents,
          {
            headers: {
              supplier_uuid: supplierUUID,
            },
          }
        );
  
        console.log("Response Data:", response.data.data.errors);
        // process.exit(0)
  
        // Extract response data
        const submissionResponse = response.data.data.submissionResponse;
        const uuid = submissionResponse.acceptedDocuments[0]?.uuid || "";
        const submissionUid = submissionResponse.submissionUid || "";
        const invoiceNumber =
          submissionResponse.acceptedDocuments[0]?.invoiceCodeNumber || "";
        const invoiceStatus = response.data.status || "";
  
        // Database operation
        try {
          const existingRecord = await prisma.tb_invoice.findMany({
            where: { uuid },
            select: { invoice_number: true, id: true },
          });
  
          if (existingRecord.length === 0) {
            writeSuccessMessage(invoiceNumber, "",uuid,invoiceStatus);
  
            const newRecord = await prisma.tb_invoice.create({
              data: {
                invoice_number: invoiceNumber,
                uuid,
                status: invoiceStatus,
                submissionuid: submissionUid,
              },
            });
  
            console.log("New record inserted successfully:", newRecord);
          } else {
            console.log("Record already exists for UUID:", uuid);
          }
        } catch (dbError: any) {
          console.error("Database operation error:", dbError);
          if (dbError.code === "P2002") {
            console.error("Unique constraint violation:", dbError.meta?.target);
          }
        }
  
        return response.data;
      } catch (error: any) {
        console.error(
          "Error in NormalReportDocuments:",
          error.response?.data || error.message
        );
        throw error;
      }

    }
    catch(err)
    {
      console.log(err)
    }
  }
  
}
