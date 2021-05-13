# ReactTencentMap
REACT腾讯地图HOOKS版本
/**
 * position                     Object对象, {lat,lng}传入经纬度. 不传默认为成都
 * closeGetLocation             是否关闭定位,默认为false
 * searchCity                   设置地址搜索指定城市,默认为成都
 * moreHeight                   当前容器内(div)需要减去的高度
 * ok                           当用户选择完成之后调用的方法
 * cancel                       用户点击取消时调用的方法
 * current中可调用的方法:{
 *  search(String:keyword)      根据传入的关键字进行地址解析,并搜索出地址信息
 *  getLocation()               获取用户选择的经纬度
 *  searchNear(Int:lat,Int:lng) 传入经纬度搜索地理位置并查询出周边
 * }
 * ps:使用地图组件需要控制父组件的刷新次数,否则会导致地图多次重复加载
 * 使用前需要先引用腾讯地图的三个js文件
 * 
 * <script src="https://map.qq.com/api/gljs?v=1.exp&key=yourKey"></script>
 * <script src='https://mapapi.qq.com/web/mapComponents/geoLocation/v/geolocation.min.js'></script>
 * <script charset="utf-8" src="https://map.qq.com/api/js?v=2.exp&key=yourKey"></script>
 */
