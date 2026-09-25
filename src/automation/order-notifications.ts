import type {OrderRecord} from "../orders/types.js";
import type {WhatsAppConnector} from "../whatsapp/types.js";
const messages:Record<string,string>={received:"تم استلام طلبك وسيتم مراجعته قريباً.",review:"طلبك قيد المراجعة الآن.",preparing:"تم تأكيد طلبك وبدأنا بتجهيزه.",shipped:"تم شحن طلبك.",on_the_way:"طلبك في الطريق إليك.",cancelled:"تم إلغاء طلبك."};
export function createOrderNotificationService(whatsapp:WhatsAppConnector){
 return {async notifyStatus(order:OrderRecord,phone:string,status:string){const template=messages[status];if(!template)return;await whatsapp.sendText(phone,"طلبك "+order.orderNumber+": "+template);}};
}
