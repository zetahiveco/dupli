import { format } from "date-fns";


export function getUniqueFileName(name: string) {
    const pid = process.pid.toString();
    const timestamp = format(new Date(), 'yyMMdd_HHmmss');
    let filename = [pid, timestamp, name].join('_');
    filename = filename.split(' ').join('_').toLowerCase();
    return filename;
}