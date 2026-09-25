package com.abw3laa.aicommerce.admin

import android.app.Activity
import android.os.Bundle
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor=Executors.newSingleThreadExecutor()
    private val prefs by lazy { getSharedPreferences("admin",Context.MODE_PRIVATE) }
    private var baseUrl=""
    private lateinit var root:LinearLayout
    private lateinit var content:LinearLayout
    private lateinit var status:TextView

    override fun onCreate(b:Bundle?){super.onCreate(b); baseUrl=prefs.getString("base","")?:""; showLogin()}

    private fun text(v:String,size:Float=16f)=TextView(this).apply{this.text=v;textSize=size;setTextColor(Color.rgb(23,32,51));setPadding(8,8,8,8)}
    private fun button(v:String)=Button(this).apply{text=v;setAllCaps(false);setPadding(12,8,12,8)}
    private fun field(hint:String,password:Boolean=false)=EditText(this).apply{this.hint=hint;setPadding(16,12,16,12);if(password)inputType=0x81}

    private fun frame():LinearLayout{root=LinearLayout(this);root.orientation=LinearLayout.VERTICAL;root.setPadding(16,16,16,16);setContentView(root);return root}
    private fun showLogin(){
        val r=frame();r.gravity=Gravity.CENTER
        r.addView(text("AI Commerce Admin",28f))
        r.addView(text("تسجيل دخول لوحة الإدارة",18f))
        val url=field("رابط السيرفر، مثال: https://example.com");url.setText(baseUrl);r.addView(url)
        val email=field("Email");r.addView(email)
        val pass=field("Password",true);r.addView(pass)
        status=text("");r.addView(status)
        val go=button("تسجيل الدخول");r.addView(go)
        go.setOnClickListener{baseUrl=url.text.toString().trim().trimEnd('/');if(baseUrl.isBlank()){status.text="أدخل رابط السيرفر";return@setOnClickListener}
            status.text="جارٍ تسجيل الدخول..."
            request("POST","/admin/login",JSONObject().put("email",email.text.toString()).put("password",pass.text.toString())){code,body,cookies->
                runOnUiThread{if(code in 200..299){prefs.edit().putString("base",baseUrl).putString("cookie",cookies).apply();showMain()}else status.text="فشل تسجيل الدخول: $code"}}
        }
    }

    private fun showMain(){
        val r=frame()
        val header=LinearLayout(this);header.orientation=LinearLayout.HORIZONTAL;header.gravity=Gravity.CENTER_VERTICAL
        val title=text("AI Commerce",24f);header.addView(title,LinearLayout.LayoutParams(0,-2,1f));val logout=button("خروج");header.addView(logout);r.addView(header)
        val nav=LinearLayout(this);nav.orientation=LinearLayout.HORIZONTAL;nav.setPadding(0,12,0,12)
        listOf("Dashboard","Products","Customers","Orders","Reports").forEach{label->val b=button(label);nav.addView(b,LinearLayout.LayoutParams(0,-2,1f));b.setOnClickListener{loadSection(label)}};r.addView(nav)
        status=text("");r.addView(status)
        content=LinearLayout(this);content.orientation=LinearLayout.VERTICAL;r.addView(ScrollView(this).apply{addView(content)},LinearLayout.LayoutParams(-1,0,1f))
        logout.setOnClickListener{prefs.edit().remove("cookie").apply();showLogin()}
        loadSection("Dashboard")
    }

    private fun loadSection(section:String){
        content.removeAllViews();content.addView(text("جارٍ التحميل...",18f))
        val path=when(section){"Products"->"/admin/products";"Customers"->"/admin/customers";"Orders"->"/admin/orders";"Reports"->"/admin/reports/summary";else->"/admin/ui-data"}
        request("GET",path,null){code,body,_->runOnUiThread{content.removeAllViews();if(code==401){showLogin();return@runOnUiThread};if(code !in 200..299){content.addView(text("خطأ HTTP $code"));return@runOnUiThread};render(section,body)}}
    }

    private fun render(section:String,body:String){
        val o=JSONObject(body)
        when(section){
            "Dashboard"->{content.addView(text("لوحة الإدارة",24f));val p=o.optJSONArray("permissions");content.addView(text("الصلاحيات: "+(p?.length()?:0)));content.addView(text("الحالة: متصل"))}
            "Reports"->{content.addView(text("التقارير",24f));content.addView(text("المنتجات: "+o.optInt("products")));content.addView(text("العملاء: "+o.optInt("customers")));content.addView(text("الطلبات: "+o.optInt("orders")));content.addView(text("الإيرادات: "+o.optInt("revenue")));content.addView(text("طلبات حسب الحالة: "+o.optJSONObject("ordersByStatus")))}
            else->{content.addView(text(section,24f));val a=JSONArray(body);for(i in 0 until a.length()){val x=a.getJSONObject(i);val card=LinearLayout(this);card.orientation=LinearLayout.VERTICAL;card.setPadding(8,12,8,12);card.setBackgroundColor(Color.WHITE);val primary=x.optString("name",x.optString("orderNumber",x.optString("phone",x.optString("id"))));card.addView(text(primary,18f));card.addView(text(x.toString(),12f));content.addView(card);content.addView(Space(this).apply{minimumHeight=8})}}
        }
    }

    private fun request(method:String,path:String,body:JSONObject?,done:(Int,String,String)->Unit){
        executor.execute{try{val u=URL(baseUrl+path);val c=u.openConnection() as HttpURLConnection;c.requestMethod=method;c.connectTimeout=15000;c.readTimeout=20000;c.setRequestProperty("Accept","application/json");val cookie=prefs.getString("cookie","")?:"";if(cookie.isNotBlank())c.setRequestProperty("Cookie",cookie);if(body!=null){c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray())}}
            val code=c.responseCode;val stream=if(code>=400)c.errorStream else c.inputStream;val response=stream?.bufferedReader()?.use{it.readText()}?:"";val set=c.getHeaderField("Set-Cookie")?:"";done(code,response,set.substringBefore(";"));c.disconnect()}catch(e:Exception){runOnUiThread{status.text=e.message?:"Network error"}}}
    }
    override fun onDestroy(){executor.shutdownNow();super.onDestroy()}
}
