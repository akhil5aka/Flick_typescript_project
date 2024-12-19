import { stat, writeFileSync } from "fs";
import moment from "moment";
import path from "path";

export const writeSuccessMessage = async (invoiceNumber: string,qrString:string,uuid:string,status:string =  "valid") => {

    const data = {
        "status": status,
        "invoice_num": invoiceNumber+"",
        "document_id_sap": invoiceNumber+"",
        "uuid": uuid,
        "qr_value": qrString
    }

    const filename = (moment().format('YYMMDDHHmmssSSSS'))+'_response'+ /*cleanupFilename(invoiceNumber) +*/ ".json";

    writeFileSync(path.join(process.env.OUT_FOLDER ?? 'OUT', filename), JSON.stringify(data,null,4).replace(/\n/g, '\r\n'), 'utf-8');

}

export const writeValidationErrorMessage = (invoiceNumber: string, errorMessage: string) => {

    console.log("Rejecting with error: ",invoiceNumber,errorMessage);
    

    const data = {
        "status": "validation_error",
        "invoice_num": invoiceNumber?.toString(),
        "document_id_sap": invoiceNumber?.toString(),
        "message": errorMessage
    }

    const filename = (moment().format('YYMMDDHHmmssSSSS'))+'_response'+ /*cleanupFilename(invoiceNumber) +*/ ".json";

    writeFileSync(path.join(process.env.OUT_FOLDER ?? 'OUT', filename), JSON.stringify(data,null,4).replace(/\n/g, '\r\n'), 'utf-8');

}
